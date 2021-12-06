import { setBornCenter } from '@/modulesGlobal/autoPlanning'
import { Color, log } from '@/utils'
import { AppLifecycleCallbacks } from '@/modulesGlobal/framework/types'
import { mountAll } from './mountAll'
import { onRoomLevelChange, scanRoomState } from '@/modulesRoom/room/strategyCore'

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
