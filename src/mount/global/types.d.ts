interface Memory {
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
     * 商品生产线配置
     * 键为工厂等级，值为被设置成对应等级的工厂所在房间名
     */
    commodities: {
        [level in FactoryLevel]: string[]
    }
    /**
     * 启动 powerSpawn 的房间名列表
     */
    psRooms: string[]
}