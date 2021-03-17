export { default as RoomExtension } from './extension'
export { default as RoomConsole } from './console'

import mountShortcut from '@/modules/shortcut'
import mountTransport from '@/modules/roomTask/transpoart'
import mountWork from '@/modules/roomTask/work'
import mountCenterTransport from '@/modules/roomTask/center'
import mountCreepRelease from '@/modules/creepController/creepRelease'

import { createGetter } from '@/utils'
import RoomShareController from '@/modules/room/share'

type AnyRoomPlugin = { new (name: string): any }

interface PluginStorage {
    [pluginName: string]: {
        [roomName: string]: AnyRoomPlugin
    }
}

/**
 * 依次挂载所有的 Room 拓展
 */
export default () => {
    // 等待安装的房间插件列表
    const plugins: [ string, AnyRoomPlugin ][] = [
        [ 'share', RoomShareController ]
    ]

    // 房间插件实例化后会被分类保存到这里
    const pluginStorage: PluginStorage = {}

    // 安装所有的插件
    plugins.forEach(([pluginName, Plugin]) => {
        pluginStorage[pluginName] = {}

        // 在房间上创建插件的访问器
        createGetter(Room, pluginName, function () {
            // 还没访问过, 进行实例化
            if (!(this.name in pluginStorage[pluginName])) {
                pluginStorage[pluginName][this.name] = new Plugin(this.name)
            }
            // 直接返回插件实例
            return pluginStorage[pluginName][this.name]
        })
    })
    // 挂载快捷方式
    mountShortcut()

    // 挂载 creep 发布
    mountCreepRelease()

    // 挂载三个任务队列
    mountCenterTransport()
    mountTransport()
    mountWork()
}

declare global {
    interface Room {
        share: RoomShareController
    }
}