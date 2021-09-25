export { default as RoomExtension } from './extension'
export { default as RoomConsole } from './console'

import { createGetter } from '@/utils'
import {
    mountShortcut,
    RoomShareController,
    RoomCenterTaskController,
    RoomTransportTaskController,
    RoomWorkTaskController,
    RoomSpawnController,
    RoomPowerController,
    RoomStrategyController,
    FactoryController,
    TerminalController,
    StorageController,
    ObserverController,
    RemoteChontroller,
    LabChontroller
} from '@/modulesRoom'

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
        [ 'spawner', RoomSpawnController ],
        [ 'power', RoomPowerController ],
        [ 'strategy', RoomStrategyController ],
        [ 'myFactory', FactoryController ],
        [ 'myTerminal', TerminalController ],
        [ 'myStorage', StorageController ],
        [ 'myObserver', ObserverController ],
        [ 'myLab', LabChontroller],
        [ 'remote', RemoteChontroller ]
    ]

    // 房间插件实例化后会被分类保存到这里
    const pluginStorage: PluginStorage = {}

    // 安装所有的插件
    plugins.forEach(([pluginName, Plugin]) => {
        pluginStorage[pluginName] = {}

        // 在房间上创建插件的懒加载访问器
        createGetter(Room, pluginName, function () {
            // 还没访问过, 进行实例化
            if (!(this.name in pluginStorage[pluginName])) {
                pluginStorage[pluginName][this.name] = new Plugin(this.name)
                // 覆盖 getter 属性
                Object.defineProperty(this, pluginName, { value: pluginStorage[pluginName][this.name] })
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
         * 孵化控制模块
         */
        spawner: RoomSpawnController
        /**
         * power 管理模块
         */
        power: RoomPowerController
        /**
         * 策略模块
         */
        strategy: RoomStrategyController
        /**
         * 工厂管理模块
         */
        myFactory: FactoryController
        /**
         * 终端管理模块
         */
        myTerminal: TerminalController
        /**
         * storage 管理模块
         */
        myStorage: StorageController
        /**
         * observer 管理模块
         */
        myObserver: ObserverController
        /**
         * lab 管理模块
         */
        myLab: LabChontroller
        /**
         * 扩张管理模块
         * 包括外矿和新房扩张
         */
        remote: RemoteChontroller
    }
}