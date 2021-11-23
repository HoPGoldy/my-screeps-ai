declare namespace NodeJS {
    interface Global {
        InterShardMemory: InterShardMemory
        Game: Game
        Memory: Memory
        _: _.LoDashStatic
    }
}

/**
 * 包含 store 属性的建筑
 */
type StructureWithStore =
    StructureTower |
    StructureStorage |
    StructureContainer |
    StructureExtension |
    StructureFactory |
    StructureSpawn |
    StructurePowerSpawn |
    StructureLink |
    StructureTerminal |
    StructureNuker |
    StructureLab

/**
 * 所有包含 id 字段的游戏对象
 */
interface ObjectWithId<T = unknown> extends RoomObject {
    id: Id<T>
}

/**
 * 允许引入 html 文件
 */
declare module '*.html' {
    const content: string
    export default content
}
