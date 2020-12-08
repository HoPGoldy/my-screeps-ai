interface Memory {
    /**
     * 移动的次数
     */
    moveNumber?: number
    /**
     * 移动消耗总用时
     */
    moveUseCpu?: number
    /**
     * 移动寻路总用时
     */
    movePathFindUseCpu?: number
    /**
     * 是否显示 cpu 消耗
     */
    showCost?: boolean
    /**
     * 核弹投放指示器
     * 核弹是否已经确认
     */
    nukerLock?: boolean
    /**
     * 核弹发射指令集，键为发射房间，值为目标旗帜名称
     */
    nukerDirective?: {
        [fireRoomName: string]: string
    }
    /**
     * 全局的喊话索引
     */
    sayIndex?: number
    /**
     * 白名单，通过全局的 whitelist 对象控制
     * 键是玩家名，值是该玩家进入自己房间的 tick 时长
     */
    whiteList: {
        [userName: string]: number
    }
    /**
     * 掠夺资源列表，如果存在的话 reiver 将只会掠夺该名单中存在的资源
     */
    reiveList: ResourceConstant[]
    /**
     * 要绕过的房间名列表，由全局模块 bypass 负责
     */
    bypassRooms: string[]
    /**
     * 资源来源表
     * 资源类型为键，房间名列表为值
     */
    resourceSourceMap: {
        [resourceType: string]: string[]
    },
    /**
     * 商品生产线配置
     * 键为工厂等级，值为被设置成对应等级的工厂所在房间名
     */
    commodities: {
        [level in FactoryLevel]: string[]
    }
    /**
     * 延迟任务存储
     */
    delayTasks: DelayTaskMemory[]
    /**
     * 所有 creep 的配置项，每次 creep 死亡或者新增时都会通过这个表来完成初始化
     */
    creepConfigs: {
        [creepName: string]: CreepConfigMemory
    }
    /**
     * 从其他 shard 跳跃过来的 creep 内存会被存放在这里
     * 等 creep 抵达后在由其亲自放在 creepConfigs 里
     * 
     * 不能直接放在 creepConfigs
     * 因为有可能出现内存到了但是 creep 还没到的情况，这时候 creepController 就会以为这个 creep 死掉了从而直接把内存回收掉
     */
    crossShardCreeps: {
        [creepName: string]: MyCreepMemory
    }
    /**
     * 全局统计信息
     */
    stats: StatsMemory
    /**
     * 启动 powerSpawn 的房间名列表
     */
    psRooms: string[]
    /**
     * 在模拟器中调试布局时才会使用到该字段，在正式服务器中不会用到该字段
     */
    layoutInfo?: BaseLayout
    /**
     * 用于标记布局获取到了那一等级
     */
    layoutLevel?: AvailableLevel
}