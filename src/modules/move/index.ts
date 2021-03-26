import { getOppositeDirection } from '@/utils'
import crossRules from './crossRules'
import { addCrossShardRequest } from '@/modules/crossShard'

/**
 * 房间移动成本缓存
 * 
 * 会缓存房间内的静态地形、道路、建筑等短时间内不会移动的对象
 * 如果出现了撞墙等情况，说明缓存过期，会在撞墙时移除缓存以便下次重新搜索
 */
export const costCache: { [roomName: string]: CostMatrix } = {}

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
 * 平均执行消耗 0.220 ~ 0.232（不包含寻路消耗）
 * 
 * @param creep 要进行移动的 creep
 * @param target 要移动到的目标位置
 * @param moveOpt 移动参数
 */
export const goTo = function (creep: Creep | PowerCreep, targetPos: RoomPosition | undefined, moveOpt: MoveOpt): ScreepsReturnCode {
    // 默认会检查目标变更
    const options = _.defaults<MoveOpt>({ checkTarget: true }, moveOpt)

    if (!creep.memory._go) creep.memory._go = {}
    const moveMemory = creep.memory._go
    // 如果没有指定目标的话则默认为路径模式
    let target: RoomPosition = targetPos || getTarget(creep)
    if (!target) return ERR_INVALID_ARGS

    const currentPos = `${creep.pos.x}/${creep.pos.y}`

    // 确认目标有没有变化, 变化了则重新规划路线
    if (options.checkTarget) {
        const targetPosTag = creep.room.serializePos(target)

        if (targetPosTag !== moveMemory.targetPos) {
            moveMemory.targetPos = targetPosTag
            delete moveMemory.path
            delete moveMemory.prePos
        }
    }

    // 有 lastMove 说明已经在移动了，检查上一 tick 移动是否成功
    // （因为上一步的移动结果在这一 tick 开始时才会更新，所以要先检查之前移动是否成功，然后再决定是否要继续移动）
    if (moveMemory.lastMove) {
        // 如果和之前位置重复了就分析撞上了啥
        if (moveMemory.prePos && currentPos == moveMemory.prePos) {
            // creep.log('发现撞停!')
            // 获取前方位置上的 creep（fontCreep）
            const fontPos = creep.pos.directionToPos(moveMemory.lastMove)

            // creep.log(creep.pos + '> [上个方向]' + moveMemory.lastMove + '>' +  fontPos)
            if (!fontPos) {
                delete moveMemory.path
                delete moveMemory.prePos
                return ERR_INVALID_TARGET
            }

            const fontCreep = fontPos.lookFor(LOOK_CREEPS)[0] || fontPos.lookFor(LOOK_POWER_CREEPS)[0]

            // 前方不是 creep 或者不是自己的 creep 或者内存被清空（正在跨越 shard）的话就不会发起对穿
            if (!fontCreep || !fontCreep.my || Object.keys(fontCreep.memory).length <= 0) {
                delete moveMemory.path
                delete moveMemory.prePos
                // 撞地形上了说明房间 cost 过期了
                delete costCache[creep.room.name]
                return ERR_INVALID_TARGET
            }
            // 尝试对穿，如果自己禁用了对穿的话则直接重新寻路
            const crossResult = options.disableCross ? ERR_BUSY : mutualCross(creep, moveMemory.lastMove, fontCreep)

            // 对穿失败说明撞墙上了或者前面的 creep 拒绝对穿，重新寻路
            if (crossResult === ERR_BUSY) {
                moveMemory.path = findPath(creep, targetPos, { ...options, disableRouteCache: true })
                delete moveMemory.prePos
            }
            else if (crossResult !== OK) {
                // creep.log('撞停！重新寻路！' + crossResult)
                delete moveMemory.path
                delete moveMemory.prePos
                // 不知道撞到了啥，反正重新加载房间缓存
                delete costCache[creep.room.name]
            }

            // 对穿失败，需要重新寻路，不需要往下继续执行
            // 对穿成功，相当于重新执行了上一步，也不需要继续往下执行
            return crossResult 
        }

        // 验证通过，没有撞停，继续下一步
        delete moveMemory.lastMove
    }

    // 如果路走完了就要重新寻路
    if (!moveMemory.path && !moveMemory.lastMove) {
        moveMemory.path = findPath(creep, target, options)
    }

    // 还为空的话就是没找到路径或者已经到了
    if (!moveMemory.path) {
        // 到达目的地后如果是路径模式的话就需要更新路径点
        if (!targetPos) updateWayPoint(creep)
        return OK
    }

    // 使用缓存进行移动
    const direction = <DirectionConstant>Number(moveMemory.path[0])
    // creep.log(`向 ${direction} 方向移动`)
    const goResult = creep.move(direction)

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
    if (creep.memory.fromShard && moveMemory.path && moveMemory.path.length === 1) {
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
                { name, memory: memory as MyCreepMemory }
            )

            // 主动释放掉自己的内存，从而避免 creepController 认为自己去世了而直接重新孵化
            // 这里因为上面已经执行了 move，所以下个 tick 就直接到目标 shard 了，不会报错找不到自己内存
            delete Memory.creeps[creep.name]

            return OK
        }
    }

    // 移动成功，更新路径
    if (goResult == OK) {
        // 移动到终端了，不需要再检查位置是否重复了
        if (moveMemory.path.length === 0) {
            delete moveMemory.lastMove
            delete moveMemory.prePos
        }
        else {
            moveMemory.prePos = currentPos
            moveMemory.lastMove = Number(moveMemory.path.substr(0, 1)) as DirectionConstant
            moveMemory.path = moveMemory.path.substr(1)
        }
    }
    // 其他异常直接报告
    else if (goResult != ERR_TIRED && goResult != ERR_BUSY) creep.say(`寻路 ${goResult}`)

    return goResult
}


/**
 * 路径模式下获取要移动到的目标
 * 
 * 会进行缓存
 * 如果内存中没有设置的话则返回 undefined
 */
const getTarget = function (creep: Creep | PowerCreep): RoomPosition {
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
export const setWayPoint = function (creep: Creep | PowerCreep, target: string[] | string) {
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
const updateWayPoint = function (creep: Creep | PowerCreep) {
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
 * 向指定方向发起对穿
 * 
 * @param creep 发起对穿的 creep
 * @param direction 要进行对穿的方向
 * @param fontCreep 要被对穿的 creep
 * 
 * @returns OK 成功对穿
 * @returns ERR_BUSY 对方拒绝对穿
 * @returns ERR_INVALID_TARGET 前方没有 creep
 */
const mutualCross = function (creep: Creep | PowerCreep, direction: DirectionConstant, fontCreep: Creep | PowerCreep): OK | ERR_BUSY | ERR_INVALID_TARGET {
    creep.say(`👉`)
    // creep.log('发起对穿！' + fontCreep.pos)

    // 如果前面的 creep 同意对穿了，自己就朝前移动
    const reverseDirection = getOppositeDirection(direction)
    const fontMoveResult = requireCross(fontCreep, reverseDirection, creep)
    if (fontMoveResult !== OK) return ERR_BUSY

    const selfMoveResult = creep.move(direction)
    return (selfMoveResult === OK && fontMoveResult === OK) ? OK : ERR_BUSY
}


/**
 * 请求对穿
 * 自己内存中 stand 为 true 时将拒绝对穿
 * 
 * @param creep 被请求对穿的 creep
 * @param direction 请求该 creep 进行对穿
 * @param requireCreep 发起请求的 creep
 */
const requireCross = function (creep: Creep | PowerCreep, direction: DirectionConstant, requireCreep: Creep | PowerCreep): ScreepsReturnCode {
    // creep 下没有 memory 说明 creep 已经凉了，直接移动即可
    if (!creep.memory) return OK

    // 获取对穿规则并进行判断
    const allowCross = crossRules[creep.memory.role] || crossRules.default
    if (!allowCross(creep, requireCreep)) {
        creep.say('👊')
        return ERR_BUSY
    }

    // 同意对穿
    creep.say('👌')
    const moveResult = creep.move(direction)
    if (moveResult === OK && creep.memory._go?.path?.length > 0) {
        // 如果移动的方向不是路径中的方向的话，就重新寻路
        if (Number(creep.memory._go.path[0]) as DirectionConstant !== direction) {
            delete creep.memory._go.path
        }
    }
    return moveResult
}


/**
 * 远程寻路
 * 
 * @param target 目标位置
 * @param range 搜索范围 默认为 1
 * @returns PathFinder.search 的返回值
 */
const findPath = function (creep: Creep | PowerCreep, target: RoomPosition, moveOpt: MoveOpt = {}): string | undefined {
    const cost1 = Game.cpu.getUsed()

    // 先查询下缓存里有没有值
    const routeKey = `${creep.room.serializePos(creep.pos)} ${creep.room.serializePos(target)}`

    if (!moveOpt.disableRouteCache) {
        const route = routeCache[routeKey]
        // 如果有值则直接返回
        if (route) return route
    }

    const range = moveOpt.range === undefined ? 1 : moveOpt.range
    const result = PathFinder.search(creep.pos, { pos: target, range }, {
        maxOps: moveOpt.maxOps || 4000,
        roomCallback: roomName => {
            // 强调了不许走就不走
            if (Memory.bypassRooms && Memory.bypassRooms.includes(roomName)) return false

            const room = Game.rooms[roomName]
            // 房间没有视野
            if (!room) return

            // 尝试从缓存中读取，没有缓存就进行查找
            let costs = (roomName in costCache) ? costCache[roomName].clone() : undefined
            if (!costs) {
                costs = new PathFinder.CostMatrix
                const terrain = new Room.Terrain(roomName)

                // 设置基础地形 cost
                for (let x = 0; x < 50; x ++) for (let y = 0; y < 50; y ++) {
                    const tile = terrain.get(x, y);
                    const weight =
                        tile === TERRAIN_MASK_WALL ? 255 : 
                        tile === TERRAIN_MASK_SWAMP ? 10 : 4

                    costs.set(x, y, weight)
                }

                const addCost = (item: Structure | ConstructionSite) => {
                    // 更倾向走道路
                    if (item.structureType === STRUCTURE_ROAD) {
                        // 造好的路可以走
                        if (item instanceof Structure) costs.set(item.pos.x, item.pos.y, 1)
                        // 路的工地保持原有 cost
                        else return
                    }
                    // 不能穿过无法行走的建筑
                    else if (item.structureType !== STRUCTURE_CONTAINER &&
                        (item.structureType !== STRUCTURE_RAMPART || !item.my) 
                    ) {
                        costs.set(item.pos.x, item.pos.y, 255)
                    }
                }

                // 给建筑和工地添加 cost
                room.find(FIND_STRUCTURES).forEach(addCost)
                room.find(FIND_CONSTRUCTION_SITES).forEach(addCost)

                costCache[roomName] = costs.clone()
            }

            // 躲避房间中的 creep
            room.find(FIND_CREEPS).forEach(otherCreep => {
                // 以下情况会躲避
                if (
                    // 如果禁用对穿了
                    moveOpt.disableCross ||
                    // 或者对方不属于自己
                    !otherCreep.my || otherCreep.memory.disableCross ||
                    // 或者对穿规则不允许
                    !(crossRules[otherCreep.memory.role] || crossRules.default)(otherCreep, creep)
                ) {
                    costs.set(otherCreep.pos.x, otherCreep.pos.y, 255)
                    // creep.log(`${creep.name} 躲避 ${otherCreep.name} 位置 [${otherCreep.pos.x}, ${otherCreep.pos.y}]`)
                }
            })
            // 躲避房间中的非己方 powercreep
            room.find(FIND_POWER_CREEPS).forEach(pc => {
                if (!pc.my) costs.set(pc.pos.x, pc.pos.y, 255)
            })

            // 跨 shard creep 需要解除目标 portal 的不可移动性（如果有的话）
            if (creep.memory.fromShard && target.roomName === roomName) {
                const portal = target.lookFor(LOOK_STRUCTURES).find(s => s.structureType === STRUCTURE_PORTAL)
                if (portal) costs.set(portal.pos.x, portal.pos.y, 2)
            }

            return costs
        }
    })
    // console.log("寻路结果", JSON.stringify(result))

    // 没找到就返回空
    if (result.path.length <= 0) return undefined
    // 找到了就进行压缩
    const route = serializeFarPath(creep, result.path)

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
const serializeFarPath = function (creep: Creep | PowerCreep, positions: RoomPosition[]): string {
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


/**
 * 显示所有 creep 的移动轨迹
 */
export const visualAllCreepPath = function () {
    Object.values(Game.creeps).forEach(creep => {
        if (!creep.memory._go || !creep.memory._go.path) return

        const directions: (string | RoomPosition)[] =  creep.memory._go.path.split('')
        directions.unshift(creep.pos)
        directions.reduce((pre: RoomPosition, next: string) => {
            const nextPos = (pre as RoomPosition).directionToPos(Number(next) as DirectionConstant)
            new RoomVisual(pre.roomName).line(pre, nextPos, {color: '#a9b7c6' })

            return nextPos
        })
    })
}