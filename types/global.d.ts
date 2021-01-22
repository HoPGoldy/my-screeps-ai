declare module NodeJS {
    interface Global {
        InterShardMemory: InterShardMemory
    }
}

/**
 * 包含任意键值对的对象
 */
type AnyObject = { [key: string]: any }

/**
 * 本项目中出现的颜色常量
 */
type Colors = 'green' | 'blue' | 'yellow' | 'red'

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

interface Memory {
    /**
     * 在 bot 第一次运行时会添加该 bot
     */
    botTag?: string
}