import { EnvContext } from '@/utils'

export type NukerContext = {
    /**
     * 获取房间中的 nuker
     */
    getRoomNuker: (room: Room) => StructureNuker
    /**
     * 获取存放 nuker 发射规划的内存
     */
    getGlobalMemory: () => NukerPlanMemory
    /**
     * 状态收集回调
     */
    scanState?: (nuker: StructureNuker) => unknown
    /**
     * 是否存在 nuker 填充任务
     */
    hasFillNukerTask: (room: Room) => boolean
    /**
     * 添加 nuker 填充任务
     */
    addFillNukerTask: (nuker: StructureNuker, resType: ResourceConstant, amount: number) => unknown
    /**
     * 获取房间中指定资源的存放数量
     */
    getResAmount: (room: Room, resType: ResourceConstant) => number
} & EnvContext

export interface NukerPlanMemory {
    /**
     * 核弹投放指示器
     * 当存在该字段时，说明 nuker 已经完成规划，准备发射了
     * 值为过期倒计时，当 tick 超过这个时间时本次规划将作废
     */
    nukerReady?: number
    /**
     * 核弹发射指令集，键为发射房间，值为目标旗帜名称
     */
    nukerDirective?: Record<string, string>
}
