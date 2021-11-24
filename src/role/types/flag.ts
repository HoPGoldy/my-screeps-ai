import { StructureWithStore } from '@/utils'
import { PbHarvestState } from './role'

declare global {
    interface FlagMemory {
        /**
         * deposit 旗帜特有，最长冷却时间
         */
        depositCooldown?: number
        /**
         * 公路房旗帜特有，抵达目标需要的时间
         */
        travelTime?: number
        /**
         * 公路房旗帜特有，travelTime 是否已经计算完成
         */
        travelComplete?: boolean
        /**
         * 该旗帜下标注的资源 id
         */
        sourceId?: Id<StructureWithStore | Deposit | StructurePowerBank | Ruin>
        /**
         * 当前 powerbank 采集的状态
         */
        state?: PbHarvestState
        /**
         * 因为外矿房间有可能没视野
         * 所以把房间名缓存进内存
         */
        roomName?: string
        /**
         * 路径点旗帜中生效
         * 用于指定下一个路径点的旗帜名
         */
        next: string
    }
}
