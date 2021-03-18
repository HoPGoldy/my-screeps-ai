export { default as RoomExtension } from './extension'
export { default as RoomConsole } from './console'

import { createGetter } from '@/utils'
import mountShortcut from '@/modules/room/shortcut'
import RoomShareController from '@/modules/room/share'
import { RoomCenterTaskController, RoomTransportTaskController, RoomWorkTaskController } from '@/modules/room/task'
import RoomCreepReleaseController from '@/modules/creepController/creepRelease'
import RoomSpawnController from '@/modules/room/spawn'

/**
 * 房间插件
 * 实例化时必须接受当前房间名
 */
type AnyRoomPlugin = { new (name: string): any }

/**
 * 插件存储
 */
interface PluginStorage {
    /** 插件的类别 */
    [pluginName: string]: {
        /** 插件管理的房间名 */
        [roomName: string]: AnyRoomPlugin
    }
}

/**
 * 依次挂载所有的 Room 拓展
 */
export default () => {
    // 挂载快捷方式
    mountShortcut()

    // 等待安装的房间插件列表
    const plugins: [ string, AnyRoomPlugin ][] = [
        [ 'share', RoomShareController ],
        [ 'centerTransport', RoomCenterTaskController ],
        [ 'transport', RoomTransportTaskController ],
        [ 'work', RoomWorkTaskController ],
        [ 'release', RoomCreepReleaseController ],
        [ 'spawn', RoomSpawnController ]
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
}

declare global {
    interface Room {
        /**
         * 资源共享模块
         */
        share: RoomShareController
        /**
         * 工作任务模块
         */
        work: RoomWorkTaskController 
        /**
         * 物流任务模块
         */
        transport: RoomTransportTaskController
        /**
         * 中央物流任务模块
         */
        centerTransport: RoomCenterTaskController
        /**
         * creep 发布模块
         */
        release: RoomCreepReleaseController
        /**
         * 孵化控制模块
         */
        spawner: RoomSpawnController
    }
}