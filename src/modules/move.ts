import { getOppositeDirection } from 'utils'
import { addCrossShardRequest } from './crossShard'

/**
 * 房间移动成本缓存
 * 
 * 会缓存房间内的静态地形、道路、建筑等短时间内不会移动的对象
 * 如果出现了撞墙等情况，说明缓存过期，会在撞墙时移除缓存以便下次重新搜索
 */
const costCache: { [roomName: string]: CostMatrix } = {}

/**
 * 路径缓存
 * 
 * Creep 在执行远程寻路时会优先检查该缓存
 * 键为路径的起点和终点名，例如："12/32/W1N1 23/12/W2N2"，值是使用 serializeFarPath 序列化后的路径
 */
export const routeCache: { [routeKey: string]: string } = {}

/**
 * 路径点缓存
 * 
 * Creep 会把自己下一个路径点对应的位置缓存在这里，这样就不用每 tick 都从内存中的路径点字符串重建位置
 * 不过这么做会导致 creep 无法立刻感知到位置的变化
 * 
 * 其键为 creep 的名字，值为下一个路径目标
 */
const wayPointCache: { [creepName: string]: RoomPosition } = {}

/**
 * 移动 creep
 * 
 * @param creep 要进行移动的 creep
 * @param target 要移动到的目标位置
 * @param moveOpt 移动参数
 */
export const goTo = function (creep: Creep, targetPos: RoomPosition | undefined, moveOpt: MoveOpt = {}): ScreepsReturnCode {
    if (!creep.memory._go) creep.memory._go = {}
    // 如果没有指定目标的话则默认为路径模式
    let target: RoomPosition = targetPos || getTarget(creep)
    if (!target) return ERR_INVALID_ARGS

    // 确认目标有没有变化, 变化了则重新规划路线
    if (moveOpt.checkTarget) {
        const targetPosTag = creep.room.serializePos(target)
        
        if (targetPosTag !== creep.memory._go?.targetPos) {
            creep.memory._go.targetPos = targetPosTag
            delete creep.memory._go.path
        }
    }

    // 确认缓存有没有被清除
    if (!creep.memory._go.path) {
        creep.memory._go.path = findPath(creep, target, moveOpt)
    }

    // 还为空的话就是没找到路径或者已经到了
    if (!creep.memory._go.path) {
        // 到达目的地后如果是路径模式的话就需要更新路径点
        if (!targetPos) updateWayPoint(creep)
        return OK
    }

    // 使用缓存进行移动
    const direction = <DirectionConstant>Number(creep.memory._go.path[0])
    const goResult = move(creep, direction, moveOpt)

    /**
     * 如果是跨 shard 单位的话就要检查下目标是不是传送门
     *
     * 这里没办法直接通过判断当前位置在不在传送门上来确定是不是要跨 shard
     * 因为在 screeps 声明周期的创建阶段中：位置变更到传送门上后会立刻把 creep 转移到新 shard
     * 而这时还没有到代码执行阶段，即：
     * 
     * - tick1: 执行 move > 判断当前位置 > 不是传送门
     * - tick2: 更新位置 > 发现新位置在传送门上 > 发送到新 shard > 执行代码（creep 到了新 shard，当前位置依旧不在传送门上）
     * 
     * 所以要在路径还有一格时判断前方是不是传送门
     */
    if (creep.memory.fromShard && creep.memory._go.path && creep.memory._go.path.length === 1) {
        const nextPos = creep.pos.directionToPos(direction)
        const portal = nextPos.lookFor(LOOK_STRUCTURES).find(s => s.structureType === STRUCTURE_PORTAL) as StructurePortal

        // 移动到去其他 shard 的传送门上了，发送跨 shard 请求
        if (portal && !(portal.destination instanceof RoomPosition)) {
            updateWayPoint(creep)
            const { name, memory } = creep
            // 移除移动路径，到下个 shard 可以重新规划路径
            delete memory._go.path
            // console.log(`向 ${portal.destination.shard} 发送 sendCreep 任务`, JSON.stringify({ name, memory }))
            // 发送跨 shard 请求来转移自己的 memory
            addCrossShardRequest(
                `sendCreep${creep.name}${Game.time}`,
                portal.destination.shard as ShardName,
                'sendCreep',
                { name, memory }
            )

            // 主动释放掉自己的内存，从而避免 creepController 认为自己去世了而直接重新孵化
            // 这里因为上面已经执行了 move，所以下个 tick 就直接到目标 shard 了，不会报错找不到自己内存
            delete Memory.creeps[creep.name]

            return OK
        }
    }

    // 移动成功，更新路径
    if (goResult == OK) creep.memory._go.path = creep.memory._go.path.substr(1)
    // 如果发生撞停或者参数异常的话说明缓存可能存在问题，移除缓存
    else if (goResult === ERR_INVALID_TARGET || goResult == ERR_INVALID_ARGS) {
        delete creep.memory._go.path
        delete costCache[creep.room.name]
    }
    // 其他异常直接报告
    else if (goResult != ERR_TIRED) creep.say(`寻路 ${goResult}`)

    return goResult
}


/**
 * 路径模式下获取要移动到的目标
 * 
 * 会进行缓存
 * 如果内存中没有设置的话则返回 undefined
 */
const getTarget = function (creep: Creep): RoomPosition {
    // 检查缓存
    let target = wayPointCache[creep.name]
    if (target) return target

    const memroy = creep.memory._go
    if (!memroy) return

    // 优先用路径旗帜
    if (memroy.wayPointFlag) {
        const flag = Game.flags[memroy.wayPointFlag]
        target = flag?.pos
    }
    // 没有🚩就找找路径数组
    else if (memroy.wayPoints && memroy.wayPoints.length > 0) {
        const [ x, y, roomName ] = memroy.wayPoints[0].split(' ')
        if (!x || !y || !roomName) {
            creep.log(`错误的路径点 ${memroy.wayPoints[0]}`)
        }
        else target = new RoomPosition(Number(x), Number(y), roomName)
    }

    wayPointCache[creep.name] = target

    // 如果还没有找到目标的话说明路径点失效了，移除整个缓存
    if (!target) delete creep.memory._go

    return target
}



/**
 * 给 Creep 设置路径点目标
 * 
 * target 是一个路径数组或者路径旗帜
 * 
 * @param target 路径点目标
 */
export const setWayPoint = function (creep: Creep, target: string[] | string) {
    if (!creep.memory._go) creep.memory._go = {}
    delete wayPointCache[creep.name]

    // 设置时会移除另一个路径模式的数据，防止这个移动完之后再回头走之前留下的路径点
    if (target instanceof Array) {
        creep.memory._go.wayPoints = target
        delete creep.memory._go.wayPointFlag
    }
    else {
        creep.memory._go.wayPointFlag = target + '0'
        delete creep.memory._go.wayPoints
    }

    return OK
}


/**
 * 更新路径点
 * 
 * 当抵达当前路径点后就需要更新内存数据以移动到下一个路径点
 */
const updateWayPoint = function (creep: Creep) {
    if (!creep.memory._go) creep.memory._go = {}
    const memory = creep.memory._go

    if (memory.wayPoints) {
        // 弹出已经抵达的路径点
        if (memory.wayPoints.length > 0) memory.wayPoints.shift()
    }
    else if (memory.wayPointFlag) {
        const preFlag = Game.flags[memory.wayPointFlag]
        
        // 如果旗帜内存里指定了下一个路径点名称的话就直接使用
        if (preFlag && preFlag.memory && preFlag.memory.next) {
            memory.wayPointFlag = preFlag.memory.next
        }
        // 否则就默认自增编号
        else {
            // 获取路径旗帜名
            const flagPrefix = memory.wayPointFlag.slice(0, memory.wayPointFlag.length - 1)
            // 把路径旗帜的编号 + 1
            const nextFlagCode = Number(memory.wayPointFlag.substr(-1)) + 1
            // 把新旗帜更新到内存，这里没有检查旗帜是否存在
            // 原因在于跨 shard 需要在跨越之前将旗帜更新到下一个，但是这时还没有到下个 shard，就获取不到位于下个 shard 的旗帜
            memory.wayPointFlag = flagPrefix + nextFlagCode
        }
    }

    // 移除缓存以便下次可以重新查找目标
    delete wayPointCache[creep.name]
}


/**
 * 向指定方向移动
 * 
 * @param target 要移动到的方向
 * @returns ERR_INVALID_TARGET 发生撞停
 */
const move = function (creep: Creep, target: DirectionConstant, moveOpt: MoveOpt): CreepMoveReturnCode | ERR_INVALID_TARGET | ERR_NOT_IN_RANGE {
    // 进行移动，并分析其移动结果，OK 时才有可能发生撞停
    const moveResult = creep.move(target) 

    if (moveResult != OK) return moveResult

    const currentPos = `${creep.pos.x}/${creep.pos.y}`
    // 如果和之前位置重复了就分析撞上了啥
    if (creep.memory.prePos && currentPos == creep.memory.prePos) {
        // 尝试对穿，如果自己禁用了对穿的话则直接重新寻路
        const crossResult = moveOpt.disableCross ? ERR_BUSY : mutualCross(creep, target)

        // 没找到说明撞墙上了或者前面的 creep 拒绝对穿，重新寻路
        if (crossResult != OK) {
            delete creep.memory._go.path
            return crossResult
        }
    }

    // 没有之前的位置或者没重复就正常返回 OK 和更新之前位置
    creep.memory.prePos = currentPos

    return OK
}


/**
 * 向指定方向发起对穿
 * 
 * @param direction 要进行对穿的方向
 * @returns OK 成功对穿
 * @returns ERR_BUSY 对方拒绝对穿
 * @returns ERR_INVALID_TARGET 前方没有 creep
 */
const mutualCross = function (creep: Creep, direction: DirectionConstant): OK | ERR_BUSY | ERR_INVALID_TARGET {
    // 获取前方位置上的 creep（fontCreep）
    const fontPos = creep.pos.directionToPos(direction)
    if (!fontPos) return ERR_INVALID_TARGET

    const fontCreep = fontPos.lookFor(LOOK_CREEPS)[0] || fontPos.lookFor(LOOK_POWER_CREEPS)[0]
    // 前方不是 creep 或者不是自己的 creep 或者内存被清空（正在跨越 shard）的话就不会发起对穿
    if (!fontCreep || !fontCreep.my || Object.keys(fontCreep.memory).length <= 0) return ERR_INVALID_TARGET

    creep.say(`👉`)
    // 如果前面的 creep 同意对穿了，自己就朝前移动
    if (requireCross(fontCreep, getOppositeDirection(direction))) {
        creep.cancelOrder('move')
        creep.move(direction)
    }
    else return ERR_BUSY

    return OK
}


/**
 * 请求对穿
 * 自己内存中 stand 为 true 时将拒绝对穿
 * 
 * @param direction 请求该 creep 进行对穿
 */
const requireCross = function (creep: Creep | PowerCreep, direction: DirectionConstant): Boolean {
    // creep 下没有 memory 说明 creep 已经凉了，直接移动即可
    if (!creep.memory) return true
    // 拒绝对穿
    if (creep.memory.stand) {
        creep.say('👊')
        return false
    }

    // 同意对穿
    creep.say('👌')
    creep.move(direction)
    return true
}


/**
 * 远程寻路
 * 
 * @param target 目标位置
 * @param range 搜索范围 默认为 1
 * @returns PathFinder.search 的返回值
 */
const findPath = function (creep: Creep, target: RoomPosition, moveOpt: MoveOpt): string | undefined {
    // 先查询下缓存里有没有值
    const routeKey = `${creep.room.serializePos(creep.pos)} ${creep.room.serializePos(target)}`
    let route = routeCache[routeKey]
    // 如果有值则直接返回
    if (route) {
        return route
    }

    const range = moveOpt.range === undefined ? 1 : moveOpt.range
    const result = PathFinder.search(creep.pos, { pos: target, range }, {
        plainCost: 2,
        swampCost: 10,
        maxOps: moveOpt.maxOps || 4000,
        roomCallback: roomName => {
            // 强调了不许走就不走
            if (Memory.bypassRooms && Memory.bypassRooms.includes(roomName)) return false
            

            const room = Game.rooms[roomName]
            // 房间没有视野
            if (!room) return

            // 尝试从缓存中读取，没有缓存就进行查找
            let costs = (room.name in costCache) ? costCache[room.name].clone() : undefined
            if (!costs) {
                costs = new PathFinder.CostMatrix

                room.find(FIND_STRUCTURES).forEach(struct => {
                    // 更倾向走道路
                    if (struct.structureType === STRUCTURE_ROAD) {
                        costs.set(struct.pos.x, struct.pos.y, 1)
                    }
                    // 不能穿过无法行走的建筑
                    else if (struct.structureType !== STRUCTURE_CONTAINER &&
                        (struct.structureType !== STRUCTURE_RAMPART || !struct.my) 
                    ) costs.set(struct.pos.x, struct.pos.y, 255)
                })

                costCache[room.name] = costs
            }

            // 避开房间中的禁止通行点
            const restrictedPos = room.getRestrictedPos()
            for (const creepName in restrictedPos) {
                // 自己注册的禁止通行点位自己可以走
                if (creepName === creep.name) continue
                const pos = room.unserializePos(restrictedPos[creepName])
                costs.set(pos.x, pos.y, 255)
            }

            // 躲避房间中的 creep
            const addCreepCost = (creep: Creep | PowerCreep) => {
                // 如果没有禁用对穿并且 creep 属于自己则不会躲避
                if (!moveOpt.disableCross && creep.my && !creep.memory.disableCross) return
                costs.set(creep.pos.x, creep.pos.y, 255)
            }

            room.find(FIND_CREEPS).forEach(addCreepCost)
            room.find(FIND_POWER_CREEPS).forEach(addCreepCost)

            // 跨 shard creep 需要解除目标 portal 的不可移动性（如果有的话）
            if (creep.memory.fromShard && target.roomName === roomName) {
                const portal = target.lookFor(LOOK_STRUCTURES).find(s => s.structureType === STRUCTURE_PORTAL)
                if (portal) costs.set(portal.pos.x, portal.pos.y, 2)
            }

            return costs
        }
    })

    // 没找到就返回空
    if (result.path.length <= 0) return undefined
    // 找到了就进行压缩
    route = serializeFarPath(creep, result.path)
    // 保存到全局缓存
    if (!result.incomplete) routeCache[routeKey] = route
    

    // 根据玩家指定的重用距离返回缓存
    return moveOpt.reusePath ? route : route.slice(0, moveOpt.reusePath)
}


/**
 * 压缩 PathFinder 返回的路径数组
 * 
 * @param positions 房间位置对象数组，必须连续
 * @returns 压缩好的路径
 */
const serializeFarPath = function (creep: Creep, positions: RoomPosition[]): string {
    if (positions.length == 0) return ''
    // 确保路径的第一个位置是自己的当前位置
    if (!positions[0].isEqualTo(creep.pos)) positions.splice(0, 0, creep.pos)

    return positions.map((pos, index) => {
        // 最后一个位置就不用再移动
        if (index >= positions.length - 1) return null
        // 由于房间边缘地块会有重叠，所以这里筛除掉重叠的步骤
        if (pos.roomName != positions[index + 1].roomName) return null
        // 获取到下个位置的方向
        return pos.getDirectionTo(positions[index + 1])
    }).join('')
}