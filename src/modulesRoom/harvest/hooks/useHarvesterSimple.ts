import { HarvestContext, HarvesterActionStrategy, HarvesterMemory, HarvestMode } from '../types'

/**
 * 能量矿采集：简单模式
 *
 * 在 container 不存在时切换为启动模式
 * 往 container 移动 > 检查 container 状态 > 无脑采集
 */
export const useHarvesterSimple = function (
    context: HarvestContext,
    setHarvestMode: (source: Source, memory: HarvesterMemory) => void
): HarvesterActionStrategy {
    const { env, addRepairContainerTask, hasTransportTask, addTransportTask, sourceUtils } = context

    return {
        prepare: (creep, source, memory) => {
            const container = sourceUtils.getContainer(source)
            if (!container) {
                memory.mode = HarvestMode.Start
                return false
            }

            creep.goTo(container.pos, { range: 0, checkTarget: false })
            // 没抵达位置了就还没准备完成
            if (!creep.pos.isEqualTo(container.pos)) return false

            // container 掉血了就发布维修任务
            if (container.hits < container.hitsMax) {
                addRepairContainerTask(source.room, container)
            }

            return true
        },
        /**
         * 采集阶段会无脑采集，过量的能量会掉在 container 上然后被接住存起来
         */
        source: (creep, source, memory) => {
            // 快死了就把身上的能量丢出去，这样就会存到下面的 container 里，否则变成墓碑后能量无法被 container 自动回收
            if (creep.ticksToLive < 2) creep.drop(RESOURCE_ENERGY)

            const result = creep.harvest(source)
            if (result === ERR_NOT_IN_RANGE) creep.goTo(source.pos, { range: 1 })

            const { storage } = source.room
            if (!storage || !storage.my || env.inInterval(20)) return false

            // 如果房间里有 storage，则定期发布 container 到 storage 的能量转移任务
            const container = sourceUtils.getContainer(source)

            // 容器没了，有可能是起了 Link 或者被敌人拆了，总之重新设置目标
            if (!container) {
                setHarvestMode(source, memory)
                return false
            }

            // 是否要发布从 container 到 storage 的能量转移任务
            // container 能量多于 200 就发，这个值应该低一点，因为要和 worker 抢能量
            // 不然有可能出现 worker 吃能量比较快导致没什么能量转移到 storage 里
            if (
                container.store[RESOURCE_ENERGY] < 200 ||
                hasTransportTask(source.room, memory.transferTaskId)
            ) return false

            const requests = [{
                from: container.id,
                to: storage.id,
                resType: RESOURCE_ENERGY,
                amount: Math.max(container.store[RESOURCE_ENERGY] / 2, 250)
            }]
            memory.transferTaskId = addTransportTask(source, requests)
            // env.log.success(`更新能量转移任务 ${Math.max(container.store[RESOURCE_ENERGY] / 2, 250)} 任务 id ${creep.memory.energyTransferId}`)

            return false
        },
        /**
         * 简单模式没有 target 阶段
         */
        target: () => true
    }
}
