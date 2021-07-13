declare module NodeJS {
    interface Global {
        InterShardMemory: InterShardMemory
        Game: Game
        Memory: Memory
        _: _.LoDashStatic
    }
}

/**
 * 包含任意键值对的对象
 */
type AnyObject = { [key: string]: any }

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
    StructureNuker

/**
 * 所有包含 id 字段的游戏对象
 */
interface ObjectWithId<T extends unknown = unknown> extends RoomObject {
    id: Id<T>
}

/**
 * 允许引入 html 文件
 */
declare module "*.html" {
    const content: string;
    export default content;
}