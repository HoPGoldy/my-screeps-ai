import { structureWithMemory } from '@/setting'
export { default as ControllerExtension } from './controller/extension'
export { default as SpawnExtension } from './spawn/extension'
export { default as TowerExtension } from './tower'
export { LinkExtension, LinkConsole } from './link'
export { default as ExtractorExtension } from './extractor'
export { StorageExtension, StorageConsole } from './storage'
export { default as NukerExtension } from './nuker'
export { PowerSpawnExtension, PowerSpawnConsole } from './powerSpawn'
export { ObserverExtension, ObserverConsole } from './observer/extension'
export { FactoryExtension, FactoryConsole } from './factory'
export { TerminalExtension, TerminalConsole } from "./terminal"
export { default as LabExtension } from "./lab/extension"
export { default as StructuresExtension } from './structure'
export { default as ContainerExtension } from './container'

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