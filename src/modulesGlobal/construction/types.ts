import { EnvContext } from '@/utils'
import { updateStructure } from '@/modulesRoom/shortcut'

/**
 * 要建造工地的位置
 */
export interface ConstructInfo<StructureType extends BuildableStructureConstant = BuildableStructureConstant> {
    /**
     * 要建造到的房间名
     */
    roomName: string
    /**
     * 要建造位置的 x 坐标
     */
    x: number
    /**
     * 要建造位置的 y 坐标
     */
    y: number
    /**
     * 要建造的建筑类型
     */
    type: StructureType
}

export interface ConstructionMemory {
    /**
     * 等待建造的工地队列
     */
    waiting?: ConstructInfo[]
    /**
     * 正在建造的工地
     * 键为工地的 id，值为工地的信息
     */
    building?: Record<string, ConstructInfo>
}

/**
 * 工地管理模块所需副作用
 */
export type ConstructionContext = {
    /**
     * 建造完成后的回调
     */
    onBuildComplete?: (structure: Structure) => unknown
    /**
     * 获取模块内存
     */
    getMemory: () => ConstructionMemory
} & EnvContext

declare global {
    interface Memory {
        waitingSites: ConstructInfo[]
        buildingSites: { [siteId: string]: ConstructInfo }
    }
}
