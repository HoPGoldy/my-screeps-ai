import { getOppositeDirection } from 'utils'

/**
 * 全局的路径缓存
 * 
 * Creep 在执行远程寻路时会优先检查该缓存
 * 键为路径的起点和终点名，例如："12/32/W1N1 23/12/W2N2"，值是使用 serializeFarPath 序列化后的路径
 */
export const routeCache = {}

/**
 * 移动 creep
 * 
 * @param creep 要进行移动的 creep
 * @param target 要移动到的目标位置
 * @param moveOpt 移动参数
 */
export const goTo = function (creep: Creep, target: RoomPosition, moveOpt: MoveOpt = {}): ScreepsReturnCode {
    if (!creep.memory._go) creep.memory._go = {}

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
    if (!creep.memory._go.path) return OK

    // 使用缓存进行移动
    const direction = <DirectionConstant>Number(creep.memory._go.path[0])
    const goResult = move(creep, direction, moveOpt)

    // 移动成功，更新路径
    if (goResult == OK) creep.memory._go.path = creep.memory._go.path.substr(1)
    // 如果发生撞停或者参数异常的话说明缓存可能存在问题，移除缓存
    else if (goResult === ERR_INVALID_TARGET || goResult == ERR_INVALID_ARGS) {
        delete creep.memory._go
    }
    // 其他异常直接报告
    else if (goResult != ERR_TIRED) creep.say(`寻路 ${goResult}`)

    return goResult
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
            delete creep.memory._go
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
    // 前方不是 creep 或者不是自己的 creep 的话就不会发起对穿
    if (!fontCreep || !fontCreep.my) return ERR_INVALID_TARGET

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
const findPath = function (creep: Creep, target: RoomPosition, moveOpt: MoveOpt): string | null {
    // 先查询下缓存里有没有值
    const routeKey = `${creep.room.serializePos(creep.pos)} ${creep.room.serializePos(target)}`
    let route = routeCache[routeKey]
    // 如果有值则直接返回
    if (route) {
        return route
    }

    const result = PathFinder.search(creep.pos, { pos: target, range: moveOpt.range || 0 }, {
        plainCost: 2,
        swampCost: 10,
        maxOps: moveOpt.maxOps || 4000,
        roomCallback: roomName => {
            // 强调了不许走就不走
            if (Memory.bypassRooms && Memory.bypassRooms.includes(roomName)) return false

            const room = Game.rooms[roomName]
            // 房间没有视野
            if (!room) return

            let costs = new PathFinder.CostMatrix

            room.find(FIND_STRUCTURES).forEach(struct => {
                if (struct.structureType === STRUCTURE_ROAD) {
                    costs.set(struct.pos.x, struct.pos.y, 1)
                }
                // 不能穿过无法行走的建筑
                else if (struct.structureType !== STRUCTURE_CONTAINER &&
                    (struct.structureType !== STRUCTURE_RAMPART || !struct.my) 
                ) costs.set(struct.pos.x, struct.pos.y, 255)
            })

            // 避开房间中的禁止通行点
            const restrictedPos = room.getRestrictedPos()
            for (const creepName in restrictedPos) {
                // 自己注册的禁止通行点位自己可以走
                if (creepName === creep.name) continue
                const pos = room.unserializePos(restrictedPos[creepName])
                costs.set(pos.x, pos.y, 0xff)
            }

            // 躲避房间中的 creep
            const addCreepCost = (creep: Creep | PowerCreep) => {
                // 如果没有禁用对穿并且 creep 属于自己则不会躲避
                if (!moveOpt.disableCross && !creep.memory.disableCross && creep.my) return
                costs.set(creep.pos.x, creep.pos.y, 255)
            }

            room.find(FIND_CREEPS).forEach(addCreepCost)
            room.find(FIND_POWER_CREEPS).forEach(addCreepCost)

            return costs
        }
    })

    // 没找到就返回 null
    if (result.path.length <= 0) return null
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