import { red, yellow } from '@/modulesGlobal'

/**
 * 规划与确认发射指令
 */
export const nuker = function () {
    // 在 flag 中搜索的旗帜关键字
    const TARGET_FLAGE_NAME = 'nuker'
    const logs = []

    const nukerDirective = {}
    // 搜索目标
    const targetFlags = Object.keys(Game.flags).filter(name => name.includes(TARGET_FLAGE_NAME))
    if (targetFlags.length <= 0) return '未找到目标，请新建名称包含 nuker 的旗帜'
    // 搜索所有核弹（填充完毕且冷却完毕）
    let hasNukerRoom = Object.values(Game.rooms).filter(({ nuker }) => nuker && !nuker.cooldown &&
        nuker.store[RESOURCE_ENERGY] >= NUKER_ENERGY_CAPACITY &&
        nuker.store[RESOURCE_GHODIUM] >= NUKER_GHODIUM_CAPACITY
    ).map(room => room.name)
    if (hasNukerRoom.length <= 0) return '未找到 nuker，请确保有装填完成的 nuker'

    logs.push(`[打击目标] ${targetFlags.join(' ')}`)
    logs.push(`[发射房间] ${hasNukerRoom.join(' ')}`)

    // 遍历所有目标，找到发射源
    for (const target of targetFlags) {
        const targetRoomName = Game.flags[target].pos.roomName
        let sourceRoomName: string

        // 遍历查找发射源
        for (const nukerRoom of hasNukerRoom) {
            if (Game.map.getRoomLinearDistance(targetRoomName, nukerRoom) <= 10) {
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

    // 写入内存
    Memory.nukerLock = true
    Memory.nukerDirective = nukerDirective

    logs.push('\n规划的打击指令如下，请确认：')
    logs.push(...Object.keys(nukerDirective).map(source => {
        const targetFlag = Game.flags[nukerDirective[source]]
        return `${source} > ${nukerDirective[source]} [${targetFlag.pos.roomName} ${targetFlag.pos.x}/${targetFlag.pos.y}]`
    }))
    logs.push(`\n确认发射请键入 ${red('confirmnuker')}，取消发射请键入 ${yellow('cancelnuker')}`)

    return logs.join('\n')
}

/**
 * 取消发射指令
 */
export const cancelNuker = function () {
    if (!Memory.nukerLock) return '没有已存在的 nuker 发射指令'

    delete Memory.nukerLock
    delete Memory.nukerDirective
    return 'nuker 发射指令已取消'
}

/**
 * 危险操作 - 确认发射指令
 */
export const confirmNuker = function () {
    const logs = []

    // 确保所有核弹都就绪了
    const hasNotReady = Object.keys(Memory.nukerDirective).find(roomName => {
        const fireRoom = Game.rooms[roomName]

        return !fireRoom || !fireRoom.nuker || fireRoom.nuker.cooldown ||
            fireRoom.nuker.store[RESOURCE_ENERGY] < NUKER_ENERGY_CAPACITY ||
            fireRoom.nuker.store[RESOURCE_GHODIUM] < NUKER_GHODIUM_CAPACITY
    })

    // 如果有未准备就绪的 nuker
    if (hasNotReady) {
        delete Memory.nukerLock
        delete Memory.nukerDirective
        return '存在 Nuker 未装填完成，请执行 nuker 命令重新规划'
    }

    // 遍历执行所有发射指令
    for (const fireRoomName in Memory.nukerDirective) {
        // 获取发射房间及落点旗帜
        const fireRoom = Game.rooms[fireRoomName]
        const targetFlag = Game.flags[Memory.nukerDirective[fireRoomName]]
        if (!targetFlag) return `${Game.flags[Memory.nukerDirective[fireRoomName]]} 旗帜不存在，该指令已跳过`

        const actionResult = fireRoom.nuker.launchNuke(targetFlag.pos)

        // 发射完成后才会移除旗帜
        if (actionResult === OK) {
            logs.push(`${fireRoomName} 已发射，打击目标 ${Memory.nukerDirective[fireRoomName]}`)
            targetFlag.remove()
        }
        else logs.push(`${fireRoomName} launchNuke 错误码 ${actionResult}, 旗帜 ${targetFlag.name} 已保留`)
    }

    delete Memory.nukerLock
    delete Memory.nukerDirective

    return logs.join('\n')
}

declare global {
    interface Memory {
        /**
         * 核弹投放指示器
         * 核弹是否已经确认
         */
        nukerLock?: boolean
        /**
         * 核弹发射指令集，键为发射房间，值为目标旗帜名称
         */
        nukerDirective?: {
            [fireRoomName: string]: string
        }
    }
}
