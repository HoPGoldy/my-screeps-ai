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
        // 没有启用则跳过
        if (!this.room.memory.factory) return
        // 没有冷却好就直接跳过
        if (this.cooldown !== 0) return

        // 实时更新房间内存中 factoryId
        if (!this.room.memory.factoryId) this.room.memory.factoryId = this.id

        // 执行 factory 工作
        this.runFactory()
    }

    /**
     * factory 的工作总入口
     * 根据当前状态跳转到指定工作
     */
    private runFactory(): void {
        switch (this.room.memory.factory.state) {
            case FACTORY_STATE.PREPARE: 
                if (Game.time % 5) return
                this.prepare()
            break
            case FACTORY_STATE.GET_RESOURCE:
                if (Game.time % 10) return
                this.getResource()
            break
            case FACTORY_STATE.WORKING:
                if (Game.time % 2) return
                this.working()
            break
            case FACTORY_STATE.PUT_RESOURCE:
                if (Game.time % 10) return
                this.putResource()
            break
        }
    }
    
    /**
     * 准备阶段
     * 该阶段会对队列中的任务进行新增（没有任务）或分解（任务无法完成）操作，一旦发现可以生成的任务，则进入下个阶段。
     */
    private prepare(): void {
        console.log('准备阶段!')
        if (!this.room.terminal) console.log(`[${this.room.name} factory] prepare 阶段未找到 terminal，已暂停`)

        // 获取当前任务，没有任务就新增顶级合成任务
        const task = this.getCurrentTask()
        if (!task) {
            this.addTask()
            return
        }

        // 查看 terminal 中底物数量是否足够
        const subResources = COMMODITIES[task.target].components
        for (const resType in subResources) {
            // 底物所需的数量
            // 由于反应可能会生成不止一个产物，所以需要除一下并向上取整
            const subResAmount = subResources[resType] * Math.ceil(task.amount / COMMODITIES[task.target].amount)

            // 所需底物数量不足就拆分任务
            if (this.room.terminal.store[resType] < subResAmount) {
                // 如果自己的等级无法合成该产品
                if ('level' in COMMODITIES[resType] && COMMODITIES[resType].level !== this.room.memory.factory.level) {
                    // 请求其他房间共享
                    this.room.shareRequest(
                        resType as CommodityConstant, 
                        subResAmount - this.room.terminal.store[resType]
                    )
                }
                // 能合成的话就添加新任务，数量为需要数量 - 已存在数量
                else this.addTask({
                    target: resType as CommodityConstant,
                    amount: subResAmount - this.room.terminal.store[resType]
                })

                // 挂起当前任务
                return this.hangTask()
            } 
        }

        // 通过了底物检查就说明可以合成，进入下个阶段
        this.room.memory.factory.state = FACTORY_STATE.GET_RESOURCE
    }

    /**
     * 获取资源
     */
    private getResource(): void {
        console.log('获取资源!')
        if (this.room.hasCenterTask(STRUCTURE_FACTORY)) return 

        const task = this.getCurrentTask()
        // 一般到这一步是不会产生没有任务的问题
        if (!task) {
            this.room.memory.factory.state = FACTORY_STATE.PREPARE
            return
        }

        // 遍历所有的底物，检查存放的是否充足
        // 自己存放的不足就发布转移任务
        const subResources = COMMODITIES[task.target].components
        for (const resType in subResources) {
            // 资源不足，发布任务
            if (this.store[resType] < subResources[resType]) {
                const source = resType === RESOURCE_ENERGY ? STRUCTURE_STORAGE : STRUCTURE_TERMINAL

                // 这里如果 terminal 中的资源也不足的话会把 factory 卡在这个位置
                // 这里不能挂起任务，因为它之后有更高级的任务以他为原料，如果它没有合成的话
                // 准备阶段会重新拆出来一个低级任务，如果底物缺失很久的话，会导致循环拆分从而堆积很多相同任务
                if (source === STRUCTURE_TERMINAL && this.room.terminal) {
                    if (this.room.terminal.store[resType] < subResources[resType]) return 
                }

                // 发布中央物流任务
                this.room.addCenterTask({
                    submit: STRUCTURE_FACTORY,
                    target: STRUCTURE_FACTORY,
                    source,
                    resourceType: resType as ResourceConstant,
                    amount: subResources[resType]
                })
                return
            }
        }

        // 能到这里说明底物都已转移完毕
        this.room.memory.factory.state = FACTORY_STATE.WORKING
    }

    /**
     * 执行合成
     */
    private working(): void {
        console.log('执行合成!')

        const task = this.getCurrentTask()
        // 一般到这一步是不会产生没有任务的问题
        if (!task) {
            this.room.memory.factory.state = FACTORY_STATE.PREPARE
            return
        }

        const actionResult = this.produce(task.target)
        
        // 底物不足了说明合成完毕
        if (actionResult === ERR_NOT_ENOUGH_RESOURCES) this.room.memory.factory.state = FACTORY_STATE.PUT_RESOURCE
        else if (actionResult === ERR_INVALID_TARGET) this.requirePower()
        else if (actionResult !== OK) console.log(`[${this.room.name} factory] working 阶段出现异常，错误码: ${actionResult}`)
    }

    /**
     * 移出资源
     */
    private putResource(): void {
        console.log('移出资源!')
        if (this.room.hasCenterTask(STRUCTURE_FACTORY)) return 

        const task = this.getCurrentTask()
        // 一般到这一步是不会产生没有任务的问题
        if (!task) {
            this.room.memory.factory.state = FACTORY_STATE.PREPARE
            return
        }

        // 把所有东西都搬出去，保持工厂存储净空
        for (const resType in this.store) {
            // 资源不足，发布任务
            const target = resType === RESOURCE_ENERGY ? STRUCTURE_STORAGE : STRUCTURE_TERMINAL
            this.room.addCenterTask({
                submit: STRUCTURE_FACTORY,
                target,
                source: STRUCTURE_FACTORY,
                resourceType: resType as ResourceConstant,
                amount: this.store[resType]
            })
            return
        }

        // 能到这里说明产物都转移完成，移除已完成任务并重新开始准备阶段
        // 这里没有检查目标产物数量是否足够就直接移除任务
        // 原因是后面合成高级任务的时候如果发现材料不足就会自动发布数量合适的新任务
        // 所以没必要在这里增加代码复杂度
        this.deleteCurrentTask()
        this.room.memory.factory.state = FACTORY_STATE.PREPARE
    }

    /**
     * 请求 power factory
     */
    private requirePower(): void {
        if (this.room.controller.isPowerEnabled) this.room.addPowerTask(PWR_OPERATE_FACTORY)
        else console.log(`[${this.room.name} factory] 请求 ${this.room.memory.factory.level} 级 PWR_OPERATE_FACTORY, 但房间并未激活 power`)
    }

    /**
     * 获取当前合成任务
     */
    private getCurrentTask(): IFactoryTask | undefined {
        if (this.room.memory.factory.taskList.length <= 0) return undefined
        else return this.room.memory.factory.taskList[0]
    }

    /**
     * 移除当前任务
     * 任务完成或者出错时调用
     */
    private deleteCurrentTask(): void {
        this.room.memory.factory.taskList.shift()
    }

    /**
     * 添加新的合成任务
     * 该方法会自行决策应该合成什么顶级产物
     * 
     * @param task 如果指定则将其添加为新任务，否则新增顶级产物合成任务
     * @returns 新任务在队列中的位置，第一个为 1
     */
    private addTask(task: IFactoryTask = undefined): number {
        if (task) return this.room.memory.factory.taskList.push(task)

        const shareTask = this.room.memory.shareTask
        let memory = this.room.memory.factory
        const topTargets: CommodityConstant[] = factoryTopTargets[memory.depositType][memory.level]
        
        // 如果房间有共享任务并且任务目标需要自己生产的话
        if (shareTask && topTargets.includes(shareTask.resourceType as CommodityConstant)) {
            // 将其添加为新任务
            return this.room.memory.factory.taskList.push({
                target: shareTask.resourceType as CommodityConstant,
                amount: shareTask.amount
            })
        }

        // 没有共享任务的话就按顺序挑选
        // 索引兜底
        if (!memory.targetIndex || memory.targetIndex >= topTargets.length) memory.targetIndex = 0
        // 添加任务，一次只合成一个顶级产物
        const taskIndex = this.room.memory.factory.taskList.push({
            target: topTargets[memory.targetIndex] as CommodityConstant,
            amount: 1
        })
        // 更新索引
        this.room.memory.factory.targetIndex = (memory.targetIndex + 1 >= topTargets.length) ?
        0 : memory.targetIndex + 1

        return taskIndex
    }

    /**
     * 挂起合成任务
     * 在任务无法进行时调用，将会把任务移动至队列末尾
     */
    private hangTask(): void {
        const task = this.room.memory.factory.taskList.shift()
        this.room.memory.factory.taskList.push(task)
    }

    /**
     * 设置工厂等级
     * 
     * @todo 如果已经有 power 的话就拒绝设置
     * 
     * @param depositType 生产线类型
     * @param level 等级
     * @returns ERR_INVALID_ARGS 生产线类型异常或者等级小于 1 或者大于 5
     * @returns ERR_NAME_EXISTS 工厂已经被 Power 强化，无法修改等级
     */
    private setLevel(depositType: DepositConstant, level: number): OK | ERR_INVALID_ARGS | ERR_NAME_EXISTS {
        if (!this.room.memory.factory) this.initMemory()
        const memory = this.room.memory.factory

        // 类型不对返回异常
        if (!(depositType in factoryTopTargets)) return ERR_INVALID_ARGS
        // 等级异常夜蛾返回错误
        if (level > 5 || level < 1) return ERR_INVALID_ARGS

        // 已经被 power 强化，无法设置等级
        if (this.effects[PWR_OPERATE_FACTORY]) return ERR_NAME_EXISTS

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
        else if (result === ERR_NAME_EXISTS) return `[${this.room.name} factory] 等级已锁定，请重建工厂后再次指定`
    }

    /**
     * 用户操作 - 输出当前工厂的状态
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
            targetIndex: 0,
            state: FACTORY_STATE.PREPARE,
            taskList: []
        }
    }
}