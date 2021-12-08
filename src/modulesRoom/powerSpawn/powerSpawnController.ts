import { createCache } from '@/utils'
import { PowerSpawnContext } from './types'

/**
 * 当前房间能量低于该值时将停止 process
 */
const POWER_PROCESS_ENERGY_LIMIT = 500000

export const createPowerSpawnController = function (context: PowerSpawnContext) {
    const { getRoomPowerSpawn, getMemory, hasFillPowerSpawnTask, addFillPowerSpawnTask, getResAmount, env } = context

    const lazyLoader = function (roomName: string) {
        const run = function (): void {
            const room = env.getRoomByName(roomName)
            const memory = getMemory(room)
            // ps 被暂停了就跳过
            if (memory.pause) return

            const ps = getRoomPowerSpawn(room)
            if (!ps) return

            // 处理 power，不检查是否足够，反正 api 内部也会检查
            ps.processPower()

            // 剩余 power 不足且 terminal 内 power 充足
            if (!keepResource(ps, RESOURCE_POWER, 10, 0, 100)) return
            // 剩余energy 不足且 storage 内 energy 充足
            keepResource(ps, RESOURCE_ENERGY, 1000, POWER_PROCESS_ENERGY_LIMIT, 500)
        }

        /**
         * 将自身存储的资源维持在指定容量之上
         *
         * @param resType 要检查的资源
         * @param needFillLimit 当资源余量少于该值时会发布搬运任务
         * @param sourceLimit 资源来源建筑中剩余目标资源最小值（低于该值将不会发布资源获取任务）
         * @param amount 要转移的话每次转移多少数量
         * @returns 该资源是否足够
         */
        const keepResource = function (ps: StructurePowerSpawn, resType: ResourceConstant, needFillLimit: number, sourceLimit: number, amount: number): boolean {
            if (ps.store[resType] >= needFillLimit) return true

            const roomRemaining = getResAmount(ps.room, resType)
            if (roomRemaining > sourceLimit && !hasFillPowerSpawnTask(ps.room)) {
                addFillPowerSpawnTask(ps, resType, Math.min(amount, roomRemaining))
            }

            return false
        }

        const on = function () {
            const room = env.getRoomByName(roomName)
            const ps = getRoomPowerSpawn(room)

            if (!ps) return `${roomName} 暂无 powerSpawn`
            const memory = getMemory(room)
            delete memory.pause
            return `${roomName} 已启动 process power`
        }

        const off = function () {
            const room = env.getRoomByName(roomName)
            const ps = getRoomPowerSpawn(room)

            if (!ps) return `${roomName} 暂无 powerSpawn`
            const memory = getMemory(room)
            memory.pause = true
            return `${roomName} 已暂停 process power`
        }

        const show = function () {
            const room = env.getRoomByName(roomName)
            const ps = getRoomPowerSpawn(room)
            if (!ps) return `${env.colorful.red('●', true)} 房间 ${roomName} 暂无 powerSpawn`

            const memory = getMemory(room)
            const logs = []
            // 生成状态
            const working = ps.store[RESOURCE_POWER] > 1 && ps.store[RESOURCE_ENERGY] > 50
            const addColor = working ? env.colorful.green : env.colorful.yellow
            const stats = memory.pause ? env.colorful.yellow('暂停中') : addColor(working ? '工作中' : '等待资源中')

            const prefix = [addColor('●', true), roomName, stats].join(' ')

            // 统计 powerSpawn、storage、terminal 的状态
            logs.push(`${prefix} POWER: ${ps.store[RESOURCE_POWER]}/${POWER_SPAWN_POWER_CAPACITY} ENERGY: ${ps.store[RESOURCE_ENERGY]}/${POWER_SPAWN_ENERGY_CAPACITY}`)
            logs.push(room.storage ? `Storage energy: ${room.storage.store[RESOURCE_ENERGY]}` : 'Storage X')
            logs.push(room.terminal ? `Terminal power: ${room.terminal.store[RESOURCE_POWER]}` : 'Terminal X')

            return logs.join(' || ')
        }

        /**
         * 本房间的 ps 是否可以工作
         */
        const isWorking = function () {
            const room = env.getRoomByName(roomName)
            const ps = getRoomPowerSpawn(room)

            if (!ps) return false
            const memory = getMemory(room)
            return !!memory.pause
        }

        return { run, on, off, show, isWorking }
    }

    const [getPsController] = createCache(lazyLoader)
    return getPsController
}

export type PowerSpawnController = ReturnType<ReturnType<typeof createPowerSpawnController>>
