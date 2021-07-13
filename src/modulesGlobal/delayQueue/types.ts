declare global {
    interface Game {
        /**
         * 本 tick 是否需要保存延迟任务队列的数据
         */
        _needSaveDelayQueueData?: true
    }

    interface Memory {
        /**
         * 延迟任务存储
         */
        delayTasks: string
    }
}

/**
 * 延迟任务的数据
 */
export interface DelayTaskData {
    /**
     * 必须为延迟任务分配一个房间名
     * 执行回调时会自动将其转换为房间对象
     */
    roomName: string
}

/**
 * 所有延迟任务的名称和数据的对应 map
 */
export interface DelayTaskDatas {
    /**
     * 刷墙工延迟孵化任务
     */
    [DelayTaskType.SpawnFiller]: DelayTaskData
    /**
     * 挖矿工延迟孵化任务
     */
    [DelayTaskType.SpawnMiner]: DelayTaskData
    /**
     * 升级工延迟孵化任务
     */
    [DelayTaskType.SpawnUpgrader]: DelayTaskData
    /**
     * 建造任务发布
     * 因为工地必须在下个 tick 才能获取到
     */
    [DelayTaskType.AddBuildTask]: DelayTaskData
    /**
     * map 库初始化任务
     */
    [DelayTaskType.MapLibraryInit]: DelayTaskData
    /**
     * map 库保存任务
     */
    [DelayTaskType.MapLibrarySave]: DelayTaskData
}

export enum DelayTaskType {
    SpawnFiller = 'spawnFiller',
    SpawnMiner = 'spawnMiner',
    SpawnUpgrader = 'spawnUpgrader',
    AddBuildTask = 'addBuildTask',
    MapLibraryInit = 'mapLibraryInit',
    MapLibrarySave = 'mapLibrarySave'
}

/**
 * 延迟任务的回调
 * 
 * @param data 任务的数据
 * @param room 该任务对应的房间对象，由数据中的 roomName 获取
 */
export type DelayTaskCallback<K extends DelayTaskType = DelayTaskType> = (
    room: Room | undefined,
    data: DelayTaskDatas[K]
) => void

/**
 * 延迟任务数据
 */
export interface DelayTask<T extends DelayTaskType = DelayTaskType> {
    /**
     * 该任务的名称
     * 会根据这个名称触发对应的回调
     */
    name: T
    /**
     * 被 JSON.stringify 压缩成字符串的任务数据，其值为任务名 + 空格 + 任务数据
     */
    data: DelayTaskDatas[T]
}
