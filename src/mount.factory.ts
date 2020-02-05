import { FACTORY_LOCK_AMOUNT, FACTORY_STATE, factoryTopTargets } from './setting'
import { createHelp } from './utils'

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
     * 设置工厂等级
     * 
     * @param depositType 生产线类型
     * @param level 等级
     * @returns ERR_INVALID_ARGS 生产线类型异常或者等级小于 1 或者大于 5
     */
    private setLevel(depositType: DepositConstant, level: number): OK | ERR_INVALID_ARGS {
        if (!this.room.memory.factory) this.initMemory()
        const memory = this.room.memory.factory

        // 类型不对返回异常
        if (!(depositType in factoryTopTargets)) return ERR_INVALID_ARGS
        // 等级异常夜蛾返回错误
        if (level > 5 || level < 1) return ERR_INVALID_ARGS

        // 如果之前注册过的话
        if (!_.isUndefined(memory.level) && memory.depositType) {
            // 移除过期的全局 comm 注册
            if (memory.depositType in Memory.commodities) {
                _.pull(Memory.commodities[memory.depositType].node[memory.level], this.room.name)
            }
            // 移除过期共享协议注册
            factoryTopTargets[memory.depositType][memory.level].forEach(resType => {
                this.room.shareRemoveSource(resType)
            })
        }

        // 注册新的共享协议
        factoryTopTargets[depositType][level].forEach(resType => {
            this.room.shareAddSource(resType)
        })
        // 注册新的全局 comm
        if (!Memory.commodities) Memory.commodities = {}
        if (!Memory.commodities[depositType]) Memory.commodities[depositType] = {
            node: {
                1: [], 2: [], 3: [], 4: [], 5: []
            }
        }
        Memory.commodities[depositType].node[level].push(this.room.name)

        // 更新内存属性
        this.room.memory.factory.level = level
        this.room.memory.factory.depositType = depositType
        return OK
    }

    /**
     * 用户操作：设置工厂等级
     * 
     * @param depositType 生产线类型
     * @param level 等级
     */
    public setlevel(depositType: DepositConstant, level: number): string {
        const result = this.setLevel(depositType, level)

        if (result === OK) return `[${this.room.name} factory] 设置成功，${depositType} 生产线 ${level} 级`
        else if (result === ERR_INVALID_ARGS) return `[${this.room.name} factory] 设置失败，请检查参数是否正确`
    }

    /**
     * 输出当前工厂的状态
     */
    public state(): string {
        if (!this.room.memory.factory) return `[${this.room.name} factory] 工厂未启用`
        const memory = this.room.memory.factory

        // 工厂基本信息
        let states = [
            `生产线类型: ${memory.depositType} 工厂等级: ${memory.level}`,
            `当前工作状态: ${memory.state}`,
            `现存任务数量: ${memory.taskList.length} 任务队列详情:`
        ]

        // 工厂任务队列详情
        if (memory.taskList.length <= 0) states.push('无任务')
        else states.push(...memory.taskList.map((task, index) => `[任务 ${index}] 任务目标: ${task.target} 任务数量: ${task.amount}`))
        
        // 组装返回
        return states.join('\n')
    }

    public help(): string {
        return createHelp([
            {
                title: '设置工厂生产线及等级',
                params: [
                    { name: 'depositType', desc: '生产线类型，必须为 RESOURCE_MIST RESOURCE_BIOMASS RESOURCE_METAL RESOURCE_SILICON 之一' },
                    { name: 'level', desc: '该工厂的生产等级， 1~5 之一'}
                ],
                functionName: 'setlevel'
            },
            {
                title: '显示工厂详情',
                functionName: 'state'
            }
        ])
    }

    /**
     * 初始化工厂内存 
     */
    private initMemory(): void {
        this.room.memory.factory = {
            state: FACTORY_STATE.PREPARE,
            taskList: []
        }
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