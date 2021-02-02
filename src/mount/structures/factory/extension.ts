import { FACTORY_STATE, factoryTopTargets, factoryBlacklist, FACTORY_LOCK_AMOUNT, factoryEnergyLimit, commodityMax } from 'setting'
import { setRoomStats } from 'modules/stats'

/**
 * Factory 原型拓展
 */
export default class FactoryExtension extends StructureFactory {
    public onWork(): void {
        // 没有启用或者暂停了则跳过
        if (!this.room.memory.factory || this.room.memory.factory.pause) return
        // 检查工厂是否在休眠
        if (this.room.memory.factory.sleep) {
            if (Game.time > this.room.memory.factory.sleep) this.wakeup()
            else return
        }

        // 执行 factory 工作
        if (this.runFactory()) {
            // 如果 storage 里能量不足了则休眠
            if (this.room.storage && this.room.storage.store[RESOURCE_ENERGY] >= factoryEnergyLimit) return
            else this.gotoBed(10000, '能量不足')
        }
    }

    /**
     * factory 的工作总入口
     * 根据当前状态跳转到指定工作
     * 
     * @returns 为 true 代表工厂本 tick 工作了，为 false 代表本 tick 休息了
     */
    private runFactory(): boolean {
        switch (this.room.memory.factory.state) {
            case FACTORY_STATE.PREPARE: 
                if (Game.time % 5) return false
                this.prepare()
            break
            case FACTORY_STATE.GET_RESOURCE:
                if (Game.time % 5) return false
                this.getResource()
            break
            case FACTORY_STATE.WORKING:
                this.working()
            break
            case FACTORY_STATE.PUT_RESOURCE:
                if (Game.time % 5) return false
                this.putResource()
            break
        }

        return true
    }
    
    /**
     * 准备阶段
     * 该阶段会对队列中的任务进行新增（没有任务）或分解（任务无法完成）操作，一旦发现可以生成的任务，则进入下个阶段。
     */
    private prepare(): void {
        // 如果存在废弃进程，则移除所有配置
        if (this.room.memory.factory.remove) {
            delete this.room.memory.factory
            return this.log(`工厂已废弃，重新初始化以开始生产`, 'green')
        }

        if (!this.room.terminal) {
            this.gotoBed(10000, '未找到 terminal')
            return this.log(`prepare 阶段未找到 terminal，已暂停`, 'red')
        }

        // 获取当前任务，没有任务就新增顶级合成任务
        const task = this.getCurrentTask()
        if (!task) {
            this.addTask()
            return
        }

        // 遍历查看 terminal 中底物数量是否足够
        const subResources = COMMODITIES[task.target].components
        for (const resType in subResources) {
            // 首先得保证这个东西是能合成的，不然推进去一个 energy 或者原矿的合成任务就尴尬了
            if (this.inBlacklist(resType as ResourceConstant)) continue

            // 底物所需的数量
            // 由于反应可能会生成不止一个产物，所以需要除一下并向上取整
            const subResAmount = this.clacSubResourceAmount(task.target, task.amount, resType as ResourceConstant)

            if (this.room.terminal.store[resType] < subResAmount) {
                this.handleInsufficientResource(resType as ResourceConstant, subResAmount)

                // 挂起当前任务
                return this.hangTask()
            }
        }

        // 通过了底物检查就说明可以合成，进入下个阶段
        this.room.memory.factory.state = FACTORY_STATE.GET_RESOURCE
    }

    /**
     * 检查资源是否位于黑名单中
     * 
     * 因为有些基础资源也是有合成任务的，而自动任务规划里就需要避开这些任务
     * 不然就会自动拆分出很多重复的任务，比如：发现需要能量 > 添加电池合成任务 > 添加能量合成任务 > ...
     */
    private inBlacklist(resType: ResourceConstant): boolean {
        return factoryBlacklist.includes(resType as MineralConstant) || !(resType in COMMODITIES)
    }

    /**
     * 处理数量不足的资源
     * 如果该资源自己可以合成的话，就会自动添加新任务
     * 
     * @param resType 数量不足的资源
     * @param amount 需要的数量
     */
    private handleInsufficientResource(resType: ResourceConstant, amount: number) {
        // 如果自己的等级无法合成该产品
        if ('level' in COMMODITIES[resType] && COMMODITIES[resType].level !== this.room.memory.factory.level) {
            const requestAmount = amount - this.room.terminal.store[resType]
            // 请求其他房间共享
            this.room.share.request(resType as CommodityConstant, requestAmount)

            // 如果这时候只有这一个任务了，就进入待机状态
            if (this.room.memory.factory.taskList.length <= 1) this.gotoBed(50, `等待共享 ${resType}*${requestAmount}`)
        }
        // 能合成的话就添加新任务，数量为需要数量 - 已存在数量
        else this.addTask({
            target: resType as CommodityConstant,
            amount: amount - this.room.terminal.store[resType]
        })
    }

    /**
     * 更新对应产物的统计信息
     * 会将刚刚造出来的产物和 terminal 已经存在的产物数量加起来更新到 stats 中
     * 
     * @param res 要更新数量的资源
     */
    private updateStats(res: ResourceConstant) {
        setRoomStats(this.room.name, () => ({
            [res]: (this.store[res] + this.room.terminal?.store[res]) || 0
        }))
    }

    /**
     * 进入待机状态
     * 
     * @param time 待机的时长
     * @param reason 待机的理由
     */
    private gotoBed(time: number, reason: string): OK | ERR_NOT_FOUND {
        if (!this.room.memory || !this.room.memory.factory) return ERR_NOT_FOUND

        this.room.memory.factory.sleep = Game.time + time
        this.room.memory.factory.sleepReason = reason
        return OK
    }

    /**
     * 从休眠中唤醒
     */
    protected wakeup(): OK | ERR_NOT_FOUND{
        if (!this.room.memory || !this.room.memory.factory) return ERR_NOT_FOUND

        delete this.room.memory.factory.sleep
        delete this.room.memory.factory.sleepReason
    }

    /**
     * 获取资源
     */
    private getResource(): void {
        if (this.room.centerTransport.hasTask(STRUCTURE_FACTORY)) return 

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
                // 合成任务需要的该材料数量
                const needAmount = this.clacSubResourceAmount(task.target, task.amount, resType as ResourceConstant)
                // 这里如果 terminal 中的资源也不足的话会把 factory 卡在这个位置
                // 这里不能挂起任务，因为它之后有更高级的任务以他为原料，如果它没有合成的话
                // 准备阶段会重新拆出来一个低级任务，如果底物缺失很久的话，会导致循环拆分从而堆积很多相同任务
                if (source === STRUCTURE_TERMINAL && this.room.terminal) {
                    if (this.room.terminal.store[resType] < needAmount) {
                        // 不在黑名单里就尝试自己合成
                        if (this.inBlacklist(resType as ResourceConstant)) {
                            this.handleInsufficientResource(resType as ResourceConstant, needAmount)
                            this.log(`发现底物不足，进行拆分：${resType} ${needAmount}`, 'yellow', true)
                        }
                        // 缺少的是基础资源，等一等
                        else this.gotoBed(100, `缺少 ${resType}*${needAmount}`)
                        // return this.log(`合成暂停，缺少 ${resType}*${needAmount}`, 'yellow')
                    }
                }

                // 发布中央物流任务
                this.room.centerTransport.addTask({
                    submit: STRUCTURE_FACTORY,
                    target: STRUCTURE_FACTORY,
                    source,
                    resourceType: resType as ResourceConstant,
                    amount: needAmount
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
        // 没有冷却好就直接跳过
        if (this.cooldown !== 0) {
            if (this.room.memory.factory.produceCheck) {
                // 发现材料不足了就进入下个阶段
                if (!this.canContinueProduce()) this.room.memory.factory.state = FACTORY_STATE.PUT_RESOURCE
                // 移除标志位，每个冷却阶段只检查一次材料是否充足就够了
                delete this.room.memory.factory.produceCheck
            }
            return
        }

        const task = this.getCurrentTask()
        // 一般到这一步是不会产生没有任务的问题
        if (!task) {
            this.room.memory.factory.state = FACTORY_STATE.PREPARE
            return
        }

        const actionResult = this.produce(task.target)
        
        // 成功生产了就将举起检查标志位，等待下个 tick 检查底物数量
        if (actionResult === OK) this.room.memory.factory.produceCheck = true
        // 这里只是个兜底，一般情况下在上面的 this.canContinueProduce() 判断后就已经确定了是否要进入下个阶段
        else if (actionResult === ERR_NOT_ENOUGH_RESOURCES) this.room.memory.factory.state = FACTORY_STATE.PUT_RESOURCE
        else if (actionResult === ERR_INVALID_TARGET || actionResult === ERR_BUSY) this.requirePower()
        else this.log(`working 阶段出现异常，错误码: ${actionResult}`, 'red')
    }

    /**
     * 检查当前 factory 中的底物是否足够再次生产
     * 
     * @returns true 表示可以继续生产，false 表示无法继续生产
     */
    private canContinueProduce(): boolean {
        // 获取当前任务
        const task = this.getCurrentTask()
        if (!task) {
            this.room.memory.factory.state = FACTORY_STATE.PREPARE
            return false
        }

        // 遍历任务目标所需的材料，如果有一项材料不足了，就说明无法继续生产
        const subRes = COMMODITIES[task.target].components
        for (const res in subRes) {
            if (this.store[res] < subRes[res]) return false
        }

        // 所有材料都充足，可以继续生产
        return true
    }

    /**
     * 移出资源
     */
    private putResource(): void {
        if (this.room.centerTransport.hasTask(STRUCTURE_FACTORY)) return 

        const task = this.getCurrentTask()
        // 一般到这一步是不会产生没有任务的问题
        if (!task) {
            this.room.memory.factory.state = FACTORY_STATE.PREPARE
            return
        }

        // 把所有东西都搬出去，保持工厂存储净空
        for (const resType in this.store) {
            // 是目标产物的话就更新统计信息
            if (resType === task.target) this.updateStats(resType)

            // 资源不足，发布任务
            const target = resType === RESOURCE_ENERGY ? STRUCTURE_STORAGE : STRUCTURE_TERMINAL
            this.room.centerTransport.addTask({
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
     * 计算合成指定目标产物需要多少材料
     * 没有对对应关系进行验证，请保证产物和材料之间存在合成关系
     * 
     * @param targetResource 要合成的目标产物类型
     * @param targetAmount 要合成的目标产物数量
     * @param subResource 要查询的合成材料类型
     */
    private clacSubResourceAmount(targetResource: CommodityConstant, targetAmount: number, subResource: ResourceConstant): number {
        const subResources = COMMODITIES[targetResource].components
        // 目标数量除于单次合成数量，向上取整后乘以单次合成所需的材料数量
        return subResources[subResource] * Math.ceil(targetAmount / COMMODITIES[targetResource].amount)
    }

    /**
     * 请求 power factory
     */
    private requirePower(): void {
        if (this.room.controller.isPowerEnabled) this.room.addPowerTask(PWR_OPERATE_FACTORY)
        else this.log(`请求 ${this.room.memory.factory.level} 级 PWR_OPERATE_FACTORY, 但房间并未激活 power`, 'yellow')
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

        let memory = this.room.memory.factory

        // 如果有用户指定的目标的话就直接生成
        if (memory.specialTraget) {
            // 如果有生产限制的话，会先检查资源底物是否充足
            if (memory.specialTraget in FACTORY_LOCK_AMOUNT) {
                const subResLimit = FACTORY_LOCK_AMOUNT[memory.specialTraget]
                // 如果 terminal 中对应底物的数量超过下线的话就会安排生产
                if (this.room.terminal && this.room.terminal.store[subResLimit.sub] > subResLimit.limit) {}
                // 否则不添加新任务
                else return 0
            }

            // 添加用户指定的新任务
            return this.room.memory.factory.taskList.push({
                target: memory.specialTraget,
                amount: 2
            })
        }

        const shareTask = this.room.memory.shareTask
        // 遍历自己内存中的所有生产线类型，从 factoryTopTargets 取出对应的顶级产物，然后展平为一维数组
        const depositTypes = memory.depositTypes || []
        const topTargets: CommodityConstant[] = _.flatten(depositTypes.map(type => factoryTopTargets[type][memory.level]))
        
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
        
        // 获取预定目标
        let topTarget = topTargets[memory.targetIndex]

        // 如果该顶级产物存在并已经超过最大生产上限，则遍历检查是否有未到上限的
        if (this.room.terminal && topTarget in commodityMax && this.room.terminal.store[topTarget] >= commodityMax[topTarget]) {
            let targetIndex = 0
            // 修正预定目标
            topTarget = topTargets.find((res, index) => {
                if (this.room.terminal.store[res] >= commodityMax[res]) return false
                else {
                    targetIndex = index
                    return true
                }
            })
            
            // 遍历了还没找到的话就休眠
            if (!topTarget) {
                this.gotoBed(100, '达到上限')
                return 0
            }
            // 找到了，按照其索引更新下次预定索引
            else this.room.memory.factory.targetIndex = (targetIndex + 1 >= topTargets.length) ?
                0 : targetIndex + 1
        }
        // 没有到达上限，按原计划更新索引
        else this.room.memory.factory.targetIndex = (memory.targetIndex + 1 >= topTargets.length) ?
            0 : memory.targetIndex + 1

        if (!topTarget) return 0
        // 添加任务，一次只合成两个顶级产物
        return this.room.memory.factory.taskList.push({
            target: topTarget,
            amount: 2
        })
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
     * @param level 等级
     * @returns ERR_INVALID_ARGS 生产线类型异常或者等级小于 1 或者大于 5
     * @returns ERR_NAME_EXISTS 工厂已经被 Power 强化，无法修改等级
     */
    protected setLevel(level: 1 | 2 | 3 | 4 | 5): OK | ERR_INVALID_ARGS | ERR_NAME_EXISTS {
        if (!this.room.memory.factory) this.initMemory()
        const memory = this.room.memory.factory

        // 等级异常就返回错误
        if (level > 5 || level < 1) return ERR_INVALID_ARGS

        // 已经被 power 强化并且等级不符，无法设置等级
        if (
            this.effects &&
            this.effects[PWR_OPERATE_FACTORY] &&
            (this.effects[PWR_OPERATE_FACTORY] as PowerEffect).level !== level
        ) return ERR_NAME_EXISTS

        // 如果之前注册过的话，就取消注册
        if (!_.isUndefined(memory.level)) {
            this.interactWithOutside('unregister', memory.depositTypes, memory.level)
        }

        // 注册新的共享协议
        this.interactWithOutside('register', memory.depositTypes, level)

        // 更新内存属性
        this.room.memory.factory.level = level
        return OK
    }

    /**
     * 设置生产线
     * 可以指定多个，会直接覆盖之前的配置，所以需要包含所有要进行的生产线类别
     * @param depositTypes 要生成的生产线类型
     * @returns ERR_INVALID_TARGET 尚未等级工厂等级
     */
    protected setChain(...depositTypes: DepositConstant[]): ERR_INVALID_TARGET | OK {
        const memory = this.room.memory.factory
        if (!memory || !memory.level) return ERR_INVALID_TARGET
        
        // 移除老的注册
        this.interactWithOutside('unregister', memory.depositTypes, memory.level)
        // 进行新的注册
        this.interactWithOutside('register', depositTypes, memory.level)
        
        this.room.memory.factory.depositTypes = depositTypes
        return OK
    }

    /**
     * 与外界交互
     * 包含了对 Memory.commodities 和资源共享协议的注册与取消注册
     * 
     * @param action register 执行注册，unregister 取消注册
     * @param depositTypes 生产线类型，可以为 undefined
     * @param level 工厂等级
     */
    private interactWithOutside(action: 'register' | 'unregister', depositTypes: DepositConstant[], level: 1 | 2 | 3 | 4 | 5) {
        // 兜个底
        if (!Memory.commodities) Memory.commodities = { 1: [], 2: [], 3: [], 4: [], 5: [] }
        // 与 Memory.commodities 交互
        if (action === 'register') Memory.commodities[level].push(this.room.name)
        else _.pull(Memory.commodities[level], this.room.name)
        
        // 与资源共享协议交互
        depositTypes = depositTypes || []
        depositTypes.forEach(type => {
            factoryTopTargets[type][level].forEach(resType => {
                if (action === 'register') this.room.share.becomeSource(resType)
                else this.room.share.leaveSource(resType)
            })
        })
    }

    /**
     * 移除当前工厂配置
     * 工厂将进入闲置状态并净空存储
     */
    protected execRemove(): OK | ERR_NOT_FOUND {
        if (!this.room.memory.factory) return ERR_NOT_FOUND

        // 进入废弃进程
        this.room.memory.factory.remove = true
        // 置为移出资源阶段
        this.room.memory.factory.state = FACTORY_STATE.PUT_RESOURCE
        // 移除队列中的后续任务
        const task = this.getCurrentTask()
        this.room.memory.factory.taskList = [ task ]
        
        return OK 
    }

    /**
     * 初始化工厂内存 
     */
    protected initMemory(): void {
        this.room.memory.factory = {
            targetIndex: 0,
            state: FACTORY_STATE.PREPARE,
            taskList: []
        }
    }
}