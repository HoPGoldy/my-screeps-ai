import { createCache } from '@/utils'
import { useHarvester } from './hooks/useHarvester'
import { useMiner } from './hooks/useMiner'
import { HarvestContext } from './types'

export const createHarvestController = function (context: HarvestContext) {
    const { env, getSource } = context
    const { harvester, releaseHarvester } = useHarvester(context)
    const { miner, releaseMiner } = useMiner(context)

    const lazyLoader = function (roomName: string) {
        /**
         * 开始采集本房间中的 source
         * 固定一个 source 发布一个单位
         */
        const startHarvestSource = function () {
            const workRoom = env.getRoomByName(roomName)
            const sources = getSource(workRoom)
            console.log('开始采集 source', sources)

            sources.forEach(source => releaseHarvester(workRoom, source.id))
        }

        /**
         * 停止采集本房间的能量矿
         */
        const stopHarvestSource = function () {
            const workRoom = env.getRoomByName(roomName)
            harvester.removeAll(workRoom)
        }

        /**
         * 开始采集本房间的元素矿
         */
        const startHarvestMineral = function () {
            const workRoom = env.getRoomByName(roomName)
            releaseMiner(workRoom)
        }

        /**
         * 停止采集本房间的元素矿
         */
        const stopHarvestMineral = function () {
            const workRoom = env.getRoomByName(roomName)
            miner.removeAll(workRoom)
        }

        /**
         * 执行本房间的基础采集工作
         * **注意！本方法应每 tick 调用一次**
         */
        const run = function () {
            const workRoom = env.getRoomByName(roomName)
            harvester.run(workRoom)
            miner.run(workRoom)
        }

        return { run, startHarvestSource, stopHarvestSource, startHarvestMineral, stopHarvestMineral }
    }

    const [getHarvestController] = createCache(lazyLoader)
    return getHarvestController
}

export type HarvestController = ReturnType<ReturnType<typeof createHarvestController>>
