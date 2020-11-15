import { structureWithMemory } from "setting"
import { assignPrototype } from "utils"
import ControllerExtension from './controller'
import SpawnExtension from './spawn'
import TowerExtension from './tower'
import { LinkExtension, LinkConsole } from './link'
import ExtractorExtension from './extractor'
import { StorageExtension, StorageConsole } from './storage'
import NukerExtension from './nuker'
import { PowerSpawnExtension, PowerSpawnConsole } from './powerSpawn'
import { ObserverExtension, ObserverConsole } from './observer'
import { FactoryExtension, FactoryConsole } from './factory'
import { TerminalExtension, TerminalConsole } from "./terminal"
import LabExtension from "./lab"
import StructuresExtension from './structure'

// 拓展和原型的对应关系
const assignMap = [
    [ Structure, StructuresExtension ],
    [ StructureController, ControllerExtension ],
    [ StructureSpawn, SpawnExtension ],
    [ StructureTower, TowerExtension ],
    [ StructureLink, LinkExtension ],
    [ StructureLink, LinkConsole ],
    [ StructureFactory, FactoryExtension ],
    [ StructureFactory, FactoryConsole ],
    [ StructureTerminal, TerminalExtension ],
    [ StructureTerminal, TerminalConsole ],
    [ StructureExtractor, ExtractorExtension ],
    [ StructureStorage, StorageExtension ],
    [ StructureStorage, StorageConsole ],
    [ StructureLab, LabExtension ],
    [ StructureNuker, NukerExtension ],
    [ StructurePowerSpawn, PowerSpawnExtension ],
    [ StructurePowerSpawn, PowerSpawnConsole ],
    [ StructureObserver, ObserverExtension ],
    [ StructureObserver, ObserverConsole ]
]

// 挂载拓展到建筑原型
export default () => {
    mountMemory()

    // 挂载所有拓展
    assignMap.forEach(protos => assignPrototype(protos[0], protos[1]))
}

/**
 * 给指定建筑挂载内存【暂未使用】
 * 要挂载内存的建筑定义在 setting.ts 中的 structureWithMemory 里
 */
function mountMemory(): void {
    structureWithMemory.forEach(structureConfig => {
        const memoryKey = structureConfig.memoryKey

        // 给指定原型挂载属性 memory
        Object.defineProperty(structureConfig.poto.prototype, 'memory', {
            configurable: true,
            // cpu 消耗：MAX 0.01 AVG 0.009 MIN 0.004
            // structure.memory.a = 1 这种赋值实际上调用的是这里的 getter
            get: function() {
                if(!this.room.memory[memoryKey]) this.room.memory[memoryKey] = {}
                return this.room.memory[memoryKey]
            },
            // cpu 消耗：AVG 0.02
            set: function(value) {
                if(!this.room.memory[memoryKey]) this.room.memory[memoryKey] = {}
    
                this.room.memory[memoryKey] = value
            }
        })
    })
}