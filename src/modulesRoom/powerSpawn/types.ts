import { EnvContext } from '@/utils'

export type PowerSpawnContext = {
    /**
     * 获取房间中的 powerSpawn
     */
    getRoomPowerSpawn: (room: Room) => StructurePowerSpawn
    /**
     * 获取 ps 内存
     */
    getMemory: (room: Room) => PowerSpawnMemory
    /**
     * 是否存在 ps 填充任务
     */
    hasFillPowerSpawnTask: (room: Room) => boolean
    /**
     * 添加 ps 填充任务
     */
    addFillPowerSpawnTask: (nuker: StructurePowerSpawn, resType: ResourceConstant, amount: number) => unknown
    /**
     * 获取房间中指定资源的存放数量
     */
    getResAmount: (room: Room, resType: ResourceConstant) => number
} & EnvContext

export interface PowerSpawnMemory {
    /**
     * powerSpawn 是否暂停
     */
    pause?: boolean
}
