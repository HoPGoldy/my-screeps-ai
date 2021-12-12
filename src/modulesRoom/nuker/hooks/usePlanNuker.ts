import { getNuker } from '@/mount/room/shortcut'
import { NukerContext } from '../types'

// 在 flag 中搜索的旗帜关键字
const TARGET_FLAGE_NAME = 'nuker'

// 规划完成后需要在多少 tick 之内发射
const FIRE_TIMEOUT = 20

/**
 * 自动规划 nuker 打击方案
 */
export const usePlanNuker = function (context: NukerContext) {
    const { env, getRoomNuker, getGlobalMemory } = context
    const { red, yellow } = env.colorful

    /**
     * 规划发射指令
     */
    const planNuker = function () {
        const logs = []
        const { flags, rooms, map, time } = env.getGame()

        const nukerDirective = {}
        // 搜索目标
        const targetFlags = Object.values(flags).filter(({ name }) => name.includes(TARGET_FLAGE_NAME))
        if (targetFlags.length <= 0) return '未找到目标，请新建名称包含 nuker 的旗帜'
        // 搜索所有核弹（填充完毕且冷却完毕）
        let hasNukerRoom = Object.values(rooms)
            .filter(room => {
                const nuker = getRoomNuker(room)
                return nuker && !nuker.cooldown &&
                    nuker.store[RESOURCE_ENERGY] >= NUKER_ENERGY_CAPACITY &&
                    nuker.store[RESOURCE_GHODIUM] >= NUKER_GHODIUM_CAPACITY
            })
            .map(room => room.name)

        if (hasNukerRoom.length <= 0) return '未找到 nuker，请确保有装填完成的 nuker'

        logs.push(`[打击目标] ${targetFlags.map(flag => flag.name).join(' ')}`)
        logs.push(`[发射房间] ${hasNukerRoom.join(' ')}`)

        // 遍历所有目标，找到发射源
        for (const target of targetFlags) {
            const targetRoomName = target.pos.roomName
            let sourceRoomName: string

            // 遍历查找发射源
            for (const nukerRoom of hasNukerRoom) {
                if (map.getRoomLinearDistance(targetRoomName, nukerRoom) <= 10) {
                    sourceRoomName = nukerRoom
                    break
                }
            }

            if (sourceRoomName) {
                // 加入指令表
                nukerDirective[sourceRoomName] = target
                // 从发射源中移除
                hasNukerRoom = _.difference(hasNukerRoom, [sourceRoomName])
            }
            else logs.push(`未找到适合攻击 ${target} 的发射点 - 距离过远`)
        }

        const memory = getGlobalMemory()

        // 写入内存
        memory.nukerReady = time + FIRE_TIMEOUT
        memory.nukerDirective = nukerDirective

        logs.push('\n规划的打击指令如下，请确认：')
        logs.push(...Object.keys(nukerDirective).map(source => {
            const targetFlag = Game.flags[nukerDirective[source]]
            return `${source} > ${nukerDirective[source]} [${targetFlag.pos.roomName} ${targetFlag.pos.x}/${targetFlag.pos.y}]`
        }))
        logs.push(`\n确认发射请键入 ${red('firenuker')}，取消发射请键入 ${yellow('cancelnuker')}`)

        return logs.join('\n')
    }

    /**
     * 取消发射指令
     */
    const cancelNuker = function () {
        const memory = getGlobalMemory()
        if (!memory.nukerReady) return '没有已存在的 nuker 发射指令'

        delete memory.nukerReady
        delete memory.nukerDirective
        return 'nuker 发射指令已取消'
    }

    /**
     * 危险操作 - 确认发射指令
     */
    const fireNuker = function () {
        const logs = []
        const memory = getGlobalMemory()

        if (!memory.nukerReady) return '不存在发射规划，请键入 nuker 执行发射规划'
        if (memory.nukerReady < env.getGame().time) {
            delete memory.nukerReady
            delete memory.nukerDirective
            return '发射规划已过期，请键入 nuker 重新执行发射规划'
        }

        // 确保所有核弹都就绪了
        const hasNotReady = Object.keys(memory.nukerDirective).find(roomName => {
            const fireRoom = env.getRoomByName(roomName)
            const nuker = getNuker(fireRoom)

            return !fireRoom || !nuker || nuker.cooldown ||
                nuker.store[RESOURCE_ENERGY] < NUKER_ENERGY_CAPACITY ||
                nuker.store[RESOURCE_GHODIUM] < NUKER_GHODIUM_CAPACITY
        })

        // 如果有未准备就绪的 nuker
        if (hasNotReady) {
            delete memory.nukerReady
            delete memory.nukerDirective
            return '存在 Nuker 未装填完成，请执行 nuker 命令重新规划'
        }

        // 遍历执行所有发射指令
        for (const fireRoomName in memory.nukerDirective) {
            // 获取发射房间及落点旗帜
            const fireRoom = env.getRoomByName(fireRoomName)
            const targetFlag = env.getFlagByName(memory.nukerDirective[fireRoomName])
            if (!targetFlag) return `${memory.nukerDirective[fireRoomName]} 旗帜不存在，该指令已跳过`

            const actionResult = getNuker(fireRoom).launchNuke(targetFlag.pos)

            // 发射完成后才会移除旗帜
            if (actionResult === OK) {
                logs.push(`${fireRoomName} 已发射，打击目标 ${memory.nukerDirective[fireRoomName]}`)
                targetFlag.remove()
            }
            else logs.push(`${fireRoomName} launchNuke 错误码 ${actionResult}, 旗帜 ${targetFlag.name} 已保留`)
        }

        delete memory.nukerReady
        delete memory.nukerDirective

        return logs.join('\n')
    }

    /**
     * 将指令挂载到全局
     */
    const mountToGlobal = function () {
        Object.assign(global, {
            nuker: planNuker,
            cancelnuker: cancelNuker,
            firenuker: fireNuker
        })
    }

    return { mountToGlobal }
}
