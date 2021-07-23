import mountCreep, { CreepExtension } from './creep'
import { PowerCreepExtension, mountPowerToRoom } from './powerCreep'
import mountRoom, { RoomExtension, RoomConsole} from './room'
import RoomPostionExtension from './roomPosition/extension'
import mountGlobal from './global'
import {
    ControllerExtension, StructuresExtension, SpawnExtension, TowerExtension, LinkExtension, LinkConsole, FactoryExtension,
    TerminalExtension, ExtractorExtension, StorageExtension, LabExtension,
    NukerExtension, PowerSpawnExtension, PowerSpawnConsole, ObserverExtension, ContainerExtension
} from './structures'
import SourceExtension from './source/extension'
import { setBornCenter } from '@/modulesGlobal/autoPlanning/planBasePos'
import FactoryConsole from '@/modulesRoom/factory/console'
import TerminalConsole from '@/modulesRoom/terminal/console'
import StorageConsole from '@/modulesRoom/storage/console'
import ShareConsole from '@/modulesRoom/share/console'
import ObserverConsole from '@/modulesRoom/observer/console'
import { Color, log } from '@/modulesGlobal'

/**
 * 所有需要挂载的原型拓展
 */
export const mountList: [ AnyClass, AnyClass ][] = [
    [ Room, RoomExtension ],
    // 挂载各个模块的手操接口
    [ Room, RoomConsole ],
    [ Room, FactoryConsole ],
    [ Room, TerminalConsole ],
    [ Room, StorageConsole ],
    [ Room, ShareConsole ],
    [ Room, ObserverConsole ],
    // 业务模块拓展挂载
    [ RoomPosition, RoomPostionExtension ],
    [ Source, SourceExtension ],
    [ Creep, CreepExtension ],
    [ PowerCreep, PowerCreepExtension ],
    [ Structure, StructuresExtension ],
    [ StructureController, ControllerExtension ],
    [ StructureSpawn, SpawnExtension ],
    [ StructureTower, TowerExtension ],
    [ StructureLink, LinkExtension ],
    [ StructureLink, LinkConsole ],
    [ StructureFactory, FactoryExtension ],
    [ StructureTerminal, TerminalExtension ],
    [ StructureExtractor, ExtractorExtension ],
    [ StructureStorage, StorageExtension ],
    [ StructureLab, LabExtension ],
    [ StructureNuker, NukerExtension ],
    [ StructurePowerSpawn, PowerSpawnExtension ],
    [ StructurePowerSpawn, PowerSpawnConsole ],
    [ StructureObserver, ObserverExtension ],
    [ StructureContainer, ContainerExtension ]
]

/**
 * 初始化存储
 */
function initStorage() {
    if (!Memory.rooms) Memory.rooms = {}
    else delete Memory.rooms.undefined

    if (!Memory.resourceSourceMap) Memory.resourceSourceMap = {}
}

/**
 * 主要拓展注册插件
 */
export const extensionAppPlugin: AppLifecycleCallbacks = {
    born: () => {
        const spawns = Object.values(Game.spawns)
        if (spawns.length > 1) return
    
        log('欢迎来到 Screeps 的世界!\n', ['hopgoldy bot'], Color.Green)
        // 设置中心点位并执行初始化配置
        setBornCenter(spawns[0])
        spawns[0].room.controller.onLevelChange(1)
        spawns[0].room.controller.stateScanner()
    },

    reset: () => {
        log('重新挂载拓展', ['global'], Color.Green)

        // 存储的兜底工作
        initStorage()

        // 挂载全部拓展
        mountGlobal()
        mountRoom()
        mountCreep()

        // 挂载 power 能力
        mountPowerToRoom()
    }
}
