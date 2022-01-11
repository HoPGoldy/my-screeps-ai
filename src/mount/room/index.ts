import { createGetter } from '@/utils'
import {
    RoomTransportTaskController,
    RoomWorkTaskController,
    RoomSpawnController,
    RoomPowerController,
    ObserverController,
    RemoteChontroller
} from '@/modulesRoom'
import { TowerController } from '@/modulesRoom/tower/controller'
import { LinkController } from '@/modulesRoom/link/linkController'
import { NukerController } from '@/modulesRoom/nuker/unkerController'
import { PowerSpawnController } from '@/modulesRoom/powerSpawn/powerSpawnController'
import { StorageController } from '@/modulesRoom/storage/storageController'
import { ShareController } from '@/modulesRoom/share/shareController'
import { LabController } from '@/modulesRoom/lab'
import { TerminalController } from '@/modulesRoom/terminal'
import { FactoryController } from '@/modulesRoom/factory'

import { getTowerController } from './tower'
import { getLinkController } from './link'
import { getNukerController } from './nuker'
import { getPsController } from './powerSpawn'
import { getStorageController } from './storage'
import { getShareController } from './share'
import { getTerminalController } from './terminal'
import { getLabController } from './lab'
import { getFactoryController } from './factory'

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
    // 房间插件实例化后会被分类保存到这里
    const pluginStorage: PluginStorage = {}

    // 等待安装的房间插件列表
    const plugins: [string, AnyRoomPlugin][] = [
        ['transport', RoomTransportTaskController],
        ['work', RoomWorkTaskController],
        ['spawner', RoomSpawnController],
        ['power', RoomPowerController],
        ['myObserver', ObserverController],
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
        ['factoryController', getFactoryController],
        ['terminalController', getTerminalController],
        ['storageController', getStorageController],
        ['towerController', getTowerController],
        ['linkController', getLinkController],
        ['nukerController', getNukerController],
        ['psController', getPsController],
        ['labController', getLabController],
        ['share', getShareController]
    ]

    // 在房间上创建插件的懒加载访问器
    modulePlugin.forEach(([pluginName, pluginLoader]) => {
        createGetter(Room, pluginName, function () {
            // 返回插件实例
            return pluginLoader(this.name)
        })
    })
}

declare global {
    interface Room {
        /**
         * 资源共享模块
         */
        share: ShareController
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
         * 工厂管理模块
         */
        factoryController: FactoryController
        /**
         * 终端管理模块
         */
        terminalController: TerminalController
        /**
         * storage 管理模块
         */
        storageController: StorageController
        /**
         * observer 管理模块
         */
        myObserver: ObserverController
        /**
         * lab 管理模块
         */
        labController: LabController
        /**
         * 扩张管理模块
         * 包括外矿和新房扩张
         */
        remote: RemoteChontroller
        /**
         * tower 防御模块
         */
        towerController: TowerController
        /**
         * link 工作模块
         */
        linkController: LinkController
        /**
         * nuker 工作模块
         */
        nukerController: NukerController
        /**
         * ps 工作模块
         */
        psController: PowerSpawnController
    }
}
