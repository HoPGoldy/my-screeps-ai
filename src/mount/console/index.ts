import { FactoryConsole } from './factory'
import { ObserverConsole } from './observer'
import { PowerSpawnConsole } from './powerSpawn'
import { StorageConsole } from './storage'
import { ShareConsole } from './share'
import TerminalConsole from './terminal'
import { LabConsole } from './lab'
import { RoomConsole } from './room'
import { RemoteConsole } from './remote'

export const mountConsole = function () {
    // 挂载各个模块的手操接口
    const mountList = [
        [Room, RoomConsole],
        [Room, FactoryConsole],
        [Room, TerminalConsole],
        [Room, StorageConsole],
        [Room, ShareConsole],
        [Room, ObserverConsole],
        [Room, RemoteConsole],
        [Room, LabConsole],
        [Room, PowerSpawnConsole]
    ]

    mountList.forEach(([targetClass, extensionClass]) => {
        // 进行挂载
        Object.getOwnPropertyNames(extensionClass.prototype).forEach(prop => {
            targetClass.prototype[prop] = extensionClass.prototype[prop]
        })
    })
}
