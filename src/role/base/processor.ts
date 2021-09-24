import { bodyConfigs, createBodyGetter } from '../bodyUtils'
import { Color } from '@/modulesGlobal/console'
import { CenterStructure } from '@/modulesRoom/taskCenter/types'
import { CreepConfig, CreepRole } from '../types/role'

/**
 * 中心搬运者
 * 从房间的中央任务队列 Room.memory.centerTransferTasks 中取出任务并执行
 * 
 * @param x 要移动到的 x 坐标
 * @param y 要移动到的 y 坐标
 * @param centerLinkId 中央 link 的 id
 */
const processor: CreepConfig<CreepRole.Processor> = {
    // 移动到指定位置
    prepare: creep => {
        const { x, y } = creep.memory.data

        if (creep.pos.isEqualTo(x, y)) return true
        else {
            creep.goTo(new RoomPosition(x, y, creep.room.name), { range: 0, checkTarget: false })
            return false
        }
    },
    // 从中央任务队列中取出任务并执行
    source: creep => {
        // 快死了就拒绝执行任务
        if (creep.ticksToLive <= 5) return false
        // 获取任务
        const task = creep.room.centerTransport.getTask()
        if (!task) return false

        // 通过房间基础服务获取对应的建筑
        // 如果取用的是能量的话就优先使用 centerlink 里的
        const structure = (
            task.resourceType === RESOURCE_ENERGY &&
            task.target !== CenterStructure.Link &&
            creep.room.centerLink.store[RESOURCE_ENERGY] > 0
        ) ? creep.room.centerLink : creep.room[task.source]

        if (!structure) {
            creep.room.centerTransport.deleteCurrentTask()
            return false
        }
        // 目标建筑如果已经满了就直接放弃该任务
        const targetStructure = creep.room[task.target]
        if (
            targetStructure &&
            (targetStructure.store as StoreDefinitionUnlimited).getFreeCapacity(task.resourceType) <= 0
        ) {
            creep.log(`${task.target} 满了`)
            creep.room.centerTransport.deleteCurrentTask()
            return false
        }

        // 取出资源
        const withdrawAmount = Math.min(creep.store.getFreeCapacity(), task.amount, structure.store[task.resourceType])
        const result = creep.withdraw(structure, task.resourceType, withdrawAmount)

        if (result === OK) return true
        // 资源不足就移除任务
        else if (result === ERR_NOT_ENOUGH_RESOURCES) {
            creep.log(`资源不足，中央任务已移除, ${JSON.stringify(task)}`)
            creep.room.centerTransport.deleteCurrentTask()
        }
        // 够不到就移动过去
        else if (result === ERR_NOT_IN_RANGE) creep.goTo(structure.pos, { range: 1 })
        else if (result === ERR_FULL) return true
        else {
            creep.log(`source 阶段取出异常，错误码 ${result}`, Color.Red)
            creep.room.centerTransport.hangTask()
        }

        return false
    },
    // 将资源移动到指定建筑
    target: creep => {
        // 没有任务就返回 source 阶段待命
        const task = creep.room.centerTransport.getTask()
        if (!task) return true

        // 提前获取携带量
        const amount = creep.store.getUsedCapacity(task.resourceType)

        let result

        // drop 任务会丢地上
        if (task.target === CenterStructure.Drop) {
            result = creep.drop(task.resourceType, amount)
        }
        // 其他任务正常转移
        else {
            // 通过房间基础服务获取对应的建筑
            const structure = creep.room[task.target]
            if (!structure) {
                creep.room.centerTransport.deleteCurrentTask()
                return false
            }

            result = creep.transferTo(structure, task.resourceType, { range: 1 })
        }

        // 如果转移完成则增加任务进度
        if (result === OK) {
            creep.room.centerTransport.handleTask(amount)
            return true
        }
        else if (result === ERR_FULL) {
            // creep.log(`target ${task.target} 满了`)
            creep.room.centerTransport.hangTask()
        }
        // 资源不足就返回 source 阶段
        else if (result === ERR_NOT_ENOUGH_RESOURCES) {
            creep.say(`取出资源`)
            return true
        }
        else if (result !== ERR_NOT_IN_RANGE) {
            creep.say(`存入 ${result}`)
            creep.room.centerTransport.hangTask()
        }

        return false
    },
    bodys: createBodyGetter(bodyConfigs.processor)
}

export default processor