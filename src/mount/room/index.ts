import { createGetter } from '@/utils'
import {
    mountShortcut,
    RoomShareController,
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
import { getTowerController } from './tower'
import { TowerController } from '@/modulesRoom/tower/controller'

export { default as RoomExtension } from './extension'
export { default as RoomConsole } from './console'

/**
 * 房间插件
 * 实例化时必须接受当前房间名
 */
type AnyRoomPlugin = { new (name: string): any }

type PluginLoader = (roomName: string) => Record<string, any>

/**
 * 插件存储
 */
interface PluginStorage {
    /** 插件的类别 */
    [pluginName: string]: {
        /** 插件管理的房间名 */
        [roomName: string]: any
    }
}

/**
 * 依次挂载所有的 Room 拓展
 */
export default () => {
    // 挂载快捷方式
    mountShortcut()

    // 房间插件实例化后会被分类保存到这里
    const pluginStorage: PluginStorage = {}

    // 等待安装的房间插件列表
    const plugins: [string, AnyRoomPlugin][] = [
        ['share', RoomShareController],
        ['transport', RoomTransportTaskController],
        ['work', RoomWorkTaskController],
        ['spawner', RoomSpawnController],
        ['power', RoomPowerController],
        ['strategy', RoomStrategyController],
        ['myFactory', FactoryController],
        ['myTerminal', TerminalController],
        ['myStorage', StorageController],
        ['myObserver', ObserverController],
        ['myLab', LabChontroller],
        ['remote', RemoteChontroller]
    ]

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

    // 等待安装的模块化插件列表
    const modulePlugin: [string, PluginLoader][] = [
        ['towerController', getTowerController]
    ]

    modulePlugin.forEach(([pluginName, pluginLoader]) => {
        pluginStorage[pluginName] = {}

        // 在房间上创建插件的懒加载访问器
        createGetter(Room, pluginName, function () {
            // 实例化
            const controller = pluginLoader(this.name)
            // 把 getter 替换成实际的功能模块
            Object.defineProperty(this, pluginName, { value: controller })
            // 直接返回插件实例
            return controller
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
        /**
         * tower 防御模块
         */
        towerController: TowerController
    }
}
