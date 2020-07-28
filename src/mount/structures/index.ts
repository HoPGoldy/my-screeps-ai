import { structureWithMemory } from "setting"
import { assignPrototype } from "utils"
import { ControllerExtension, SpawnExtension, TowerExtension, LinkExtension, ExtractorExtension, StorageExtension, NukerExtension, PowerSpawnExtension, ObserverExtension } from "./structures"
import FactoryExtension from "./factory"
import TerminalExtension from "./terminal"
import LabExtension from "./lab"
import StructureExtension from './structure'

// 拓展和原型的对应关系
const assignMap = [
    [ Structure, StructureExtension ],
    [ StructureController, ControllerExtension ],
    [ StructureSpawn, SpawnExtension ],
    [ StructureTower, TowerExtension ],
    [ StructureLink, LinkExtension ],
    [ StructureFactory, FactoryExtension ],
    [ StructureTerminal, TerminalExtension ],
    [ StructureExtractor, ExtractorExtension ],
    [ StructureStorage, StorageExtension ],
    [ StructureLab, LabExtension ],
    [ StructureNuker, NukerExtension ],
    [ StructurePowerSpawn, PowerSpawnExtension ],
    [ StructureObserver, ObserverExtension ]
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