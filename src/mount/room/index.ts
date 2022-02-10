import { createGetter } from '@/utils'
import { TowerController } from '@/modulesRoom/tower/controller'
import { LinkController } from '@/modulesRoom/link/linkController'
import { NukerController } from '@/modulesRoom/nuker/unkerController'
import { PowerSpawnController } from '@/modulesRoom/powerSpawn/powerSpawnController'
import { StorageController } from '@/modulesRoom/storage/storageController'
import { ShareController } from '@/modulesRoom/share/shareController'
import { LabController } from '@/modulesRoom/lab'
import { TerminalController } from '@/modulesRoom/terminal'
import { FactoryController } from '@/modulesRoom/factory'
import { SpawnController } from '@/modulesRoom/spawn'
import { HarvestController } from '@/modulesRoom/harvest'
import { ObserverController } from '@/modulesRoom/observer'
import { PowerController } from '@/modulesRoom/power'
import { WorkController } from '@/modulesRoom/taskWork'
import { TransportController } from '@/modulesRoom/taskTransport'

import { getTowerController } from './tower'
import { getLinkController } from './link'
import { getNukerController } from './nuker'
import { getPsController } from './powerSpawn'
import { getStorageController } from './storage'
import { getShareController } from './share'
import { getTerminalController } from './terminal'
import { getLabController } from './lab'
import { getFactoryController } from './factory'
import { getSpawnController } from './spawn'
import { getHarvestController } from './harvest'
import { getObserverController } from './observer'
import { getPowerController } from './power'
import { getWorkController } from './work'
import { getTransportController } from './transport'

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
    // 等待安装的模块化插件列表
    const modulePlugin: [string, PluginLoader][] = [
        ['spawnController', getSpawnController],
        ['harvest', getHarvestController],
        ['work', getWorkController],
        ['transport', getTransportController],
        ['factoryController', getFactoryController],
        ['terminalController', getTerminalController],
        ['storageController', getStorageController],
        ['towerController', getTowerController],
        ['linkController', getLinkController],
        ['nukerController', getNukerController],
        ['psController', getPsController],
        ['labController', getLabController],
        ['observerController', getObserverController],
        ['share', getShareController],
        ['power', getPowerController]
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
         * 孵化管理模块
         */
        spawnController: SpawnController
        /**
         * 基础采集模块
         */
        harvest: HarvestController
        /**
         * 资源共享模块
         */
        share: ShareController
        /**
         * 工作任务模块
         */
        work: WorkController
        /**
         * 物流任务模块
        */
        transport: TransportController
        /**
         * power 管理模块
         */
        power: PowerController
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
         * lab 管理模块
         */
        labController: LabController
        /**
         * 扩张管理模块
         * 包括外矿和新房扩张
         */
        // remote: RemoteChontroller
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
        /**
         * 过道采集模块
         */
        observerController: ObserverController
    }
}
