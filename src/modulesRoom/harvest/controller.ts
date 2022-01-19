import { createCache } from '@/utils'
import { HarvesterMemory } from '.'
import { DEFAULT_HARVESTER_ROLE, DEFAULT_MINER_ROLE } from './constants'
import { getHarvesterBody, useHarvester, getHarvesterName } from './hooks/useHarvester'
import { getMinerBody, getMinerName, useMiner } from './hooks/useMiner'
import { HarvestContext } from './types'

export const createHarvestController = function (context: HarvestContext) {
    const {
        env, getSource, addSpawnTask,
        harvesterRole = DEFAULT_HARVESTER_ROLE, minerRole = DEFAULT_MINER_ROLE
    } = context
    const miner = useMiner(context)
    const harvester = useHarvester(context)

    const lazyLoader = function (roomName: string) {
        /**
         * 开始采集本房间中的 source
         * 固定一个 source 发布一个单位
         */
        const startHarvestSource = function () {
            const workRoom = env.getRoomByName(roomName)
            const sources = getSource(workRoom)

            sources.forEach((source, index) => {
                addSpawnTask<HarvesterMemory>(
                    workRoom,
                    getHarvesterName(roomName, index),
                    harvesterRole,
                    getHarvesterBody(workRoom.energyAvailable),
                    { sourceId: source.id }
                )
            })
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
            const creepName = getMinerName(roomName)
            addSpawnTask(workRoom, creepName, minerRole, getMinerBody(workRoom.energyAvailable))
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
