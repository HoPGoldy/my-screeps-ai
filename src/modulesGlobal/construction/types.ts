import { log } from '../console'
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

/**
 * 工地管理模块所需副作用
 */
export interface CreateOptions {
    log: typeof log
    updateStructure: typeof updateStructure
    /**
     * 获取当前存在的工地
     */
    getGameSites: () => { [siteId: string]: ConstructionSite }
    /**
     * 获取等待放置的工地队列
     */
    getWaitingSites: () => ConstructInfo[]
    /**
     * 设置等待放置的工地队列
     */
    setWaitingSites: (newList: ConstructInfo[]) => void
    /**
     * 获取正在建造的工地 hash
     */
    getBuildSites: () => { [siteId: string]: ConstructInfo }
    /**
     * 设置正在建造的工地 hash
     */
    setBuildingSites: (newList: { [siteId: string]: ConstructInfo }) => void
}

declare global {
    interface Memory {
        waitingSites: ConstructInfo[]
        buildingSites: { [siteId: string]: ConstructInfo }
    }
}
