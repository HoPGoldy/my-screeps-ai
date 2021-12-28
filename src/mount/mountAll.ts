import mountCreep, { CreepExtension } from './creep'
import { PowerCreepExtension } from '@/modulesGlobal/powerCreep'
import mountRoom, { RoomExtension, RoomConsole } from './room'
import mountGlobal from './global'
import FactoryConsole from '@/modulesRoom/factory/console'
import ObserverConsole from '@/modulesRoom/observer/console'
import RemoteConsole from '@/modulesRoom/remote/console'
import LabConsole from '@/modulesRoom/lab/console'
import { Color, log } from '@/utils'
import { PowerSpawnConsole } from './room/powerSpawn'
import { StorageConsole } from './room/storage'
import ShareConsole from './room/share'
import TerminalConsole from './room/terminalConsole'

/**
 * 初始化存储
 */
const initStorage = function () {
    if (!Memory.rooms) Memory.rooms = {}
    else delete Memory.rooms.undefined

    if (!Memory.resourceSourceMap) Memory.resourceSourceMap = {}
    if (!Memory.waitSpawnCreeps) Memory.waitSpawnCreeps = {}
}

/**
 * 把已经孵化的 pc 能力注册到其所在的房间上
 * 方便房间内其他 RoomObject 查询并决定是否发布 power 任务
 */
const mountPowerToRoom = function () {
    Object.values(Game.powerCreeps).forEach(pc => {
        pc.room && pc.room.power.addSkill(pc)
    })
}

export const mountAll = function () {
    // 所有需要挂载的原型拓展
    const mountList = [
        [Room, RoomExtension],
        // 挂载各个模块的手操接口
        [Room, RoomConsole],
        [Room, FactoryConsole],
        [Room, TerminalConsole],
        [Room, StorageConsole],
        [Room, ShareConsole],
        [Room, ObserverConsole],
        [Room, RemoteConsole],
        [Room, LabConsole],
        [Room, PowerSpawnConsole],
        // 模块拓展挂载
        [Creep, CreepExtension],
        [PowerCreep, PowerCreepExtension]
    ]

    mountList.forEach(([targetClass, extensionClass]) => {
        // 进行挂载
        Object.getOwnPropertyNames(extensionClass.prototype).forEach(prop => {
            targetClass.prototype[prop] = extensionClass.prototype[prop]
        })
    })

    // 存储的兜底工作
    initStorage()

    // 挂载全部拓展
    mountGlobal()
    mountRoom()
    mountCreep()

    // 初始化 power 能力
    mountPowerToRoom()

    log('拓展挂载完成', 'global', Color.Green)
}
