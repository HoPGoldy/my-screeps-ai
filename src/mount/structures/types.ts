import { Color } from '@/utils'

declare global {
    /**
     * 建筑拓展
     */
    interface Structure {
        // 是否为自己的建筑，某些建筑不包含此属性，也可以等同于 my = false
        my?: boolean
    }

    interface StructurePowerSpawn {
        run(): void
        /**
         * 查看状态
         */
        stats(): string
    }

    interface StructureNuker {
        run(): void
    }
}
