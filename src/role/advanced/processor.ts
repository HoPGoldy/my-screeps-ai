import { bodyConfigs } from 'setting'
import { createBodyGetter } from 'utils'

/**
 * 中心搬运者
 * 从房间的中央任务队列 Room.memory.centerTransferTasks 中取出任务并执行
 * 
 * @param spawnRoom 出生房间名称
 * @param x 要移动到的 x 坐标
 * @param y 要移动到的 y 坐标
 * @param centerLinkId 中央 link 的 id
 */
const processor: CreepConfigGenerator<'processor'> = data => ({
    // 移动到指定位置
    prepare: creep => {
        if (creep.pos.isEqualTo(data.x, data.y)) return true
        else {
            creep.goTo(new RoomPosition(data.x, data.y, creep.room.name), { range: 0 })
            return false
        }
    },
    // 从中央任务队列中取出任务并执行
    source: creep => {
        // 快死了就拒绝执行任务
        if (creep.ticksToLive <= 5) return false
        // 获取任务
        const task = creep.room.getCenterTask()
        if (!task) return false

        // 通过房间基础服务获取对应的建筑
        const structure: AnyStructure = creep.room[task.source]
        if (!structure) {
            creep.room.deleteCurrentCenterTask()
            return false
        }

        // 获取取出数量
        let withdrawAmount = creep.store.getFreeCapacity()
        if (withdrawAmount > task.amount) withdrawAmount = task.amount
        // 尝试取出资源
        const result = creep.withdraw(structure, task.resourceType, withdrawAmount)
        if (result === OK) return true
        // 资源不足就移除任务
        else if (result === ERR_NOT_ENOUGH_RESOURCES) creep.room.deleteCurrentCenterTask()
        // 够不到就移动过去
        else if (result === ERR_NOT_IN_RANGE) creep.goTo(structure.pos, { range: 1 })
        else if (result === ERR_FULL) return true
        else {
            creep.log(`source 阶段取出异常，错误码 ${result}`, 'red')
            creep.room.hangCenterTask()
        }

        return false
    },
    // 将资源移动到指定建筑
    target: creep => {
        // 没有任务就返回 source 阶段待命
        const task = creep.room.getCenterTask()
        if (!task) return true

        // 提前获取携带量
        const amount: number = creep.store.getUsedCapacity(task.resourceType)

        // 通过房间基础服务获取对应的建筑
        const structure: AnyStructure = creep.room[task.target]
        if (!structure) {
            creep.room.deleteCurrentCenterTask()
            return false
        }
        
        const result = creep.transfer(structure, task.resourceType)
        // 如果转移完成则增加任务进度
        if (result === OK) {
            creep.room.handleCenterTask(amount)
            return true
        }
        // 如果目标建筑物太远了，就移动过去
        else if (result === ERR_NOT_IN_RANGE) creep.goTo(structure.pos, { range: 1 })
        else if (result === ERR_FULL) {
            creep.log(`${task.target} 满了`)
            if (task.target === STRUCTURE_TERMINAL) Game.notify(`[${creep.room.name}] ${task.target} 满了，请尽快处理`)
            creep.room.hangCenterTask()
        }
        // 资源不足就返回 source 阶段
        else if (result === ERR_NOT_ENOUGH_RESOURCES) {
            creep.say(`取出资源`)
            return true
        }
        else {
            creep.say(`存入 ${result}`)
            creep.room.hangCenterTask()
        }

        return false
    },
    bodys: createBodyGetter(bodyConfigs.processor)
})

export default processor