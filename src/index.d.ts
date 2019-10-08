declare module NodeJS {
    // 全局对象
    interface Global {
        // 是否已经挂载拓展
        hasExtension: boolean
    }
}

/**
 * 建筑拓展
 * 有可能有自定义的 work 方法
 */
interface Structure {
    work?(): void
}

/**
 * Spawn 拓展
 */
interface StructureSpawn {
    addTask(taskName: string): number
}

/**
 * Creep 拓展
 * 来自于 mount.creep.ts
 */
interface Creep {
    work(): void
    updateState(workingMsg?: string, onStateChange?: Function): boolean
    checkEnemy(): boolean
    standBy(): void
    defense(): void
    fillSpawnEngry(backupStorageId?: string): boolean
    findPathInRoom(target: RoomPosition): PathStep[]
    farMoveTo(target: RoomPosition): 0|-1|-4|-11|-12|-5|-10
    fillTower(): boolean
    upgrade(): boolean
    sign(content: string): void
    buildStructure(): boolean
    moveToRoom(roomName: string): boolean
    repairStructure(): boolean
    fillDefenseStructure(expectHits?: number): boolean
    claim(): boolean
    getEngryFrom(target: Structure|Source): ScreepsReturnCode
    transferTo(target: Structure, RESOURCE: ResourceConstant): ScreepsReturnCode
    attackFlag()
    healTo(creeps: Creep[]): void
    isHealth(): boolean
}

/**
 * 某个结构的位置信息
 */
interface IPositionInfo {
    id?: string
    roomName: string
    x: number
    y: number
}

/**
 * spawn 内存拓展
 * 
 * @property {string[]} spawnList 生产队列，元素为 creepConfig 的键名
 */
interface SpawnMemory {
    spawnList?: string[]
}

/**
 * creep 内存拓展
 * @property ready creep是否已经准备好可以工作了
 * @property role creep的角色
 * @property working 是否在工作
 * @property hasSendRebirth 是否已经往 spwan 队列中推送了自己的重生任务
 * @property path 行进路线
 * @property fillWallId 要填充的墙 id 
 * @property constructionSiteId 建筑工特有 当前缓存的建筑工地
 * @property expectHits 城墙填充特有，标志当前期望的城墙生命值
 */
interface CreepMemory {
    ready: boolean
    role: string
    working: boolean
    hasSendRebirth: boolean
    path?: PathStep[]
    fillWallId?: string
    constructionSiteId?: string
    expectHits?: number
    squad?: number
}

/**
 * creep 的配置项
 * @property prepare 准备阶段执行的方法
 * @property isReady 是否准备完成
 * @property source creep非工作(收集能量时)执行的方法
 * @property target creep工作时执行的方法
 * @property switch 更新状态时触发的方法, 该方法必须位于 Creep 上, 且可以返回 true/false
 * @property spawn 要进行生产的出生点
 */
interface ICreepConfig {
    prepare?: (creep: Creep) => any
    isReady?: (creep: Creep) => boolean
    target?: (creep: Creep) => any
    source?: (creep: Creep) => any
    switch?: (creep: Creep) => boolean
    spawn: string
    bodys: BodyPartConstant[]
}

/**
 * creep 的配置项列表
 */
interface ICreepConfigs {
    [creepName: string]: ICreepConfig
}

/**
 * link 配置项
 * @property target link在准备好了的时候执行的方法
 */
interface ILinkConfig {
    target: (link: StructureLink) => any
}

/**
 * link 配置项列表
 */
interface ILinkConfigs {
    [linkId: string]: ILinkConfig
}

/**
 * 从路径名到颜色的映射表
 */
interface IPathMap {
    [propName: string]: string
}