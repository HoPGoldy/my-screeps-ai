import { getRoomTransferTask, transferTaskOperations } from 'role/advanced/transferTaskOperations'
import { bodyConfigs, ROOM_TRANSFER_TASK } from 'setting'
import { createBodyGetter } from 'utils'

/**
 * 填充单位
 * 从 container 中获取能量 > 执行房间物流任务
 * 在空闲时间会尝试把能量运输至 storage
 */
const filler: CreepConfigGenerator<'filler'> = data => ({
    // 能量来源（container）没了就自觉放弃
    isNeed: room => {
        // 这里调用 room.sourceContainers 可以移除掉过期的 container id
        return !!room.sourceContainers.find(container => container.id === data.sourceId)
    },
    // 一直尝试从 container 里获取能量，不过拿到了就走
    source: creep => {
        if (creep.store[RESOURCE_ENERGY] > 0) return true

        // 获取源 container
        let source: StructureContainer | StructureStorage = Game.getObjectById(data.sourceId as Id<StructureContainer>)
        // container 没能量了就尝试从 storage 里获取能量执行任务
        // 原因是有了 sourceLink 之后 container 会有很长一段时间没人维护（直到 container 耐久掉光）
        // 如果没有这个判断的话 filler 会在停止孵化之前有好几辈子都呆在空 container 前啥都不干
        if (!source || source.store[RESOURCE_ENERGY] <= 0) source = creep.room.storage

        creep.getEngryFrom(source)
    },
    // 维持房间能量填充
    target: creep => {
        const task = getRoomTransferTask(creep.room)

        // 只会执行能量填充任务
        if (task && (task.type === ROOM_TRANSFER_TASK.FILL_EXTENSION || task.type === ROOM_TRANSFER_TASK.FILL_TOWER)) {
            return transferTaskOperations[task.type].target(creep, task)
        }

        // 空闲时间会尝试把能量存放到 storage 里
        if (!creep.room.storage) return false

        const source = Game.getObjectById(data.sourceId as Id<StructureContainer>)
        // source container 还有 harvester 维护时才会把能量转移至 storage
        // 否则结合 source 阶段，filler 会在 container 等待老化时在 storage 旁边无意义举重
        if (source && source.store[RESOURCE_ENERGY] > 0) creep.transferTo(creep.room.storage, RESOURCE_ENERGY)
        else creep.say('💤')

        if (creep.store[RESOURCE_ENERGY] <= 0) return true
    },
    bodys: createBodyGetter(bodyConfigs.manager)
})

export default filler