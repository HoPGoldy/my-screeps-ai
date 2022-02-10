import { Color, log } from '@/utils'
import { AppLifecycleCallbacks } from '@/modulesGlobal/framework/types'
import { onRoomLevelChange, scanRoomState } from './room/strategy/strategyCore'
import mountCreep from './creep'
import mountRoom from './room'
import { mountGlobal } from './global'
import { mountConsole } from './console'
import { setBornCenter } from './room/autoPlanner'

export { roomRunner } from './room/roomHelper'

/**
 * 初始化存储
 */
const initStorage = function () {
    if (!Memory.rooms) Memory.rooms = {}
    else delete Memory.rooms.undefined
}

const mountAll = function () {
    // 存储的兜底工作
    initStorage()

    // 挂载全部拓展
    mountGlobal()
    mountRoom()
    mountConsole()
    mountCreep()

    log('拓展挂载完成', 'global', Color.Green)
}

/**
 * 主要拓展注册插件
 */
export const createGlobalExtension = function (): AppLifecycleCallbacks {
    mountAll()

    return {
        born: () => {
            const spawns = Object.values(Game.spawns)
            if (spawns.length > 1) return

            log('欢迎来到 Screeps 的世界!\n', 'hopgoldy bot', Color.Green)
            // 设置中心点位并执行初始化配置
            setBornCenter(spawns[0])
            onRoomLevelChange(spawns[0].room, 1)
            scanRoomState(spawns[0].room.controller)
        }
    }
}
