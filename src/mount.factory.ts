import { FACTORY_LOCK_AMOUNT } from './setting'

/**
 * 当工厂中的目标商品数量超过该值时
 * 所有的目标商品都将转移至 termial 
 */
const FACTORY_TARGET_LIMIT = 500

/**
 * Factory 原型拓展
 */
export default class FactoryExtension extends StructureFactory {
    public work(): void {
        // 没有冷却好就直接跳过
        if (this.cooldown !== 0) return

        // 实时更新房间内存中 factoryId
        if (!this.room.memory.factoryId) this.room.memory.factoryId = this.id

        // 获取不到目标资源就跳过
        const targetResource: ResourceConstant = this.room.getFactoryTarget()
        if (!targetResource) return
        
        // 优先把做好的资源转移出去, 默认为 500
        if (this.store.getUsedCapacity(targetResource) >= FACTORY_TARGET_LIMIT) {
            this.addPutTask(targetResource)
            return
        }
        
        // 收集需要的资源
        if (!this.getNeedResource(targetResource)) return

        // 资源凑齐了就直接开始生成
        this.produce(<CommodityConstant|MineralConstant|RESOURCE_GHODIUM>targetResource)
    }

    /**
     * 装填合成需要的资源
     * 
     * @param target 想要合成的资源
     * @returns 是否装填完成
     */
    private getNeedResource(target: ResourceConstant): boolean {
        const componentResources = COMMODITIES[target].components
        for (const component in componentResources) {
            // 如果自己存储里该资源的数量不足，则发布任务
            if (this.store[component] < componentResources[component]) {
                // 检查 terminal 中底物数量是否足够
                if (!this.room.terminal) {
                    console.log(`[${this.room.name} factory] 未发现 terminal，已停工`)
                    return false
                }

                // 如果底物有数量限制的话要先达标才会发布任务
                if ((component in FACTORY_LOCK_AMOUNT) && (this.room.terminal.store[component] < FACTORY_LOCK_AMOUNT[component])) {
                    // console.log(`[${this.room.name} factory] ${component} 数量不足, ${this.room.terminal.store[component]}/${FACTORY_LOCK_AMOUNT[component]}，已停工`)
                    // 在这里添加进入休眠阶段
                    return false
                }

                this.addGetTask(component as ResourceConstant, componentResources[component])
                return false
            }
        }

        return true
    }

    /**
     * 向房间中央转移队列发布获取资源任务
     * 从 storage 中获取指定的资源
     * 
     * @param resourceType 想要获取的资源类型
     * @param amount 想要获取的资源数量
     */
    public addGetTask(resourceType: ResourceConstant, amount: number): void {
        // 发布前先检查下有没有任务
        if (this.room.hasCenterTask(STRUCTURE_FACTORY)) return 

        this.room.addCenterTask({
            submit: STRUCTURE_FACTORY,
            // 如果是能量就从 storage 里拿，是其他资源就从 terminal 里拿
            source: resourceType == RESOURCE_ENERGY ? STRUCTURE_STORAGE : STRUCTURE_TERMINAL,
            target: STRUCTURE_FACTORY,
            resourceType: resourceType,
            amount: amount
        })
    }
    
    /**
     * 向房间中央转移队列发布移出资源任务
     * 将自己 store 中合成好的资源全部转移到 termial 中
     * 
     * @param resourceType 想要转移出去的资源类型
     */
    public addPutTask(resourceType: ResourceConstant): void {
        // 发布前先检查下有没有任务
        if (this.room.hasCenterTask(STRUCTURE_FACTORY)) return 

        this.room.addCenterTask({
            submit: STRUCTURE_FACTORY,
            source: STRUCTURE_FACTORY,
            target: STRUCTURE_TERMINAL,
            resourceType: resourceType,
            amount: this.store.getUsedCapacity(resourceType)
        })
    }
}