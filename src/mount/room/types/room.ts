import { Color } from "@/modulesGlobal";

declare global {
    /**
     * 房间内存
     */
    interface RoomMemory {
        /**
         * 该房间发起移除操作的时间
         * 执行移除时会检查该时间，如果已经过期的话将不会执行移除操作 
         */
        removeTime?: number
        /**
         * 基地中心点坐标, [0] 为 x 坐标, [1] 为 y 坐标
         */
        center: [ number, number ]
        /**
         * 基地中心的待选位置, [0] 为 x 坐标, [1] 为 y 坐标
         */
        centerCandidates?: [ number, number ][]
        /**
         * 是否关闭自动布局，该值为 true 时将不会对本房间运行自动布局
         */
        noLayout: boolean
        /**
         * 建筑工的当前工地目标，用于保证多个建筑工的工作统一以及建筑工死后不会寻找新的工地
         */
        constructionSiteId: Id<ConstructionSite>
        /**
         * lab 内存
         */
        lab?: LabMemory
        /**
         * 中央 link 的 id
         */
        centerLinkId?: Id<StructureLink>
        /**
         * 升级 link 的 id
         */
        upgradeLinkId?: Id<StructureLink>
        /**
         * 外矿专用内存字段
         */
        remote: {
            /**
             * 外矿房间名
             */
            [roomName: string]: {
                /**
                 * 该外矿什么时候可以恢复采集，在被入侵时触发
                 */
                disableTill?: number
                /**
                 * 该外矿要把能量运到哪个建筑里，保存下来是为了后面方便自动恢复外矿采集
                 */
                targetId: Id<StructureWithStore>
            }
        }
        /**
         * 当前被 repairer 或 tower 关注的墙
         */
        focusWall: {
            id: Id<StructureWall | StructureRampart>
            endTime: number
        }
        /**
         * 当前房间所处的防御模式
         * defense 为基础防御，active 为主动防御，该值未定义时为日常模式
         */
        defenseMode?: 'defense' | 'active'
        /**
         * 战争状态
         */
        war?: { }
        /**
         * boost 强化任务
         * @see doc/boost设计案
         */
        boost?: BoostTask
        /**
         * powerSpawn 是否暂停
         */
        pausePS?: boolean
        /**
         * 当前房间物流单位的数量
         */
        transporterNumber?: number
        /**
         * 当前房间工作单位的数量
         */
        workerNumber?: number
    }

    /**
     * 房间拓展
     * 来自于 mount.structure.ts
     */
    interface Room {
        /**
         * 发送日志
         * 
         * @param content 日志内容
         * @param instanceName 发送日志的实例名
         * @param color 日志前缀颜色
         * @param notify 是否发送邮件
         */
        log(content:string, instanceName?: string, color?: Color, notify?: boolean): void

        /**
         * 当前房间中存在的敌人
         * 已拥有的房间特有，tower 负责维护
         */
        _enemys: (Creep|PowerCreep)[]
        /**
         * 需要维修的建筑，tower 负责维护，为 1 说明建筑均良好
         */
        _damagedStructure: AnyStructure | 1
        /**
         * 该 tick 是否已经有 tower 刷过墙了
         */
        _hasFillWall: boolean
        /**
         * 外矿房间特有，外矿单位维护
         * 一旦该字段为 true 就告诉出生点暂时禁止自己重生直到 1500 tick 之后
         */
        _hasEnemy: boolean
        /**
         * 焦点墙，维修单位总是倾向于优先修复该墙体
         */
        _importantWall: StructureWall | StructureRampart
        /**
         * 该房间是否已经执行过 lab 集群作业了
         * 在 Lab.work 中调用，一个房间只会执行一次
         */
        _hasRunLab: boolean

        /**
         * pos 处理 api
         */
        serializePos(pos: RoomPosition): string
        unserializePos(posStr: string): RoomPosition | undefined

        /**
         * 资源共享 api
         */
        giver(roomName: string, resourceType: ResourceConstant, amount?: number): string

        /**
         * boost api 
         */
        boost(boostType: string, boostConfig: BoostConfig): OK | ERR_NAME_EXISTS | ERR_NOT_FOUND | ERR_INVALID_ARGS | ERR_NOT_ENOUGH_RESOURCES
        boostCreep(creep: Creep): OK | ERR_NOT_FOUND | ERR_BUSY | ERR_NOT_IN_RANGE

        /**
         * 战争相关 api
         */
        startWar(boostType: BoostType): OK | ERR_NAME_EXISTS | ERR_NOT_FOUND | ERR_INVALID_TARGET
        stopWar(): OK | ERR_NOT_FOUND

        /**
         * 自动规划相关
         */
        findBaseCenterPos(): RoomPosition[]
        confirmBaseCenter(targetPos?: RoomPosition[]): RoomPosition | ERR_NOT_FOUND
        setBaseCenter(pos: RoomPosition): OK | ERR_INVALID_ARGS
        planLayout(): string
        addRemote(remoteRoomName: string, targetId: string): OK | ERR_INVALID_TARGET | ERR_NOT_FOUND
        removeRemote(remoteRoomName: string, removeFlag?: boolean): OK | ERR_NOT_FOUND
        claimRoom(targetRoomName: string, signText?: string): OK
    }
}
