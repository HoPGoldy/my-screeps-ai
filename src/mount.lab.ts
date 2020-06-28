import { reactionSource, LAB_STATE, labTarget, BOOST_RESOURCE, ROOM_TRANSFER_TASK } from './setting'

/**
 * Lab 原型拓展
 * 
 * 会自动监听 terminal 中的化合物是否足够
 * 不足的话会自行合成
 * 在房间启用战争状态时会完成本轮化合物合成后切入战争状态
 * 在战争状态结束后后自动清理 lab 中残留的强化材料并重新恢复化合物合成
 */
export default class LabExtension extends StructureLab {
    public work(): void {
        // 房间没有初始化 lab 集群则检查下有没有 boost 后退出
        if (!this.room.memory.lab) {
            if (this.room.memory.boost && !this.room._hasRunLab) {
                this.room._hasRunLab = true

                if (Game.time % 10) return
                this.boostController()
            }
            return
        }

        // lab 集群已被暂停 同样退出
        if (this.room.memory.lab.pause) return

        // [重要] 执行 lab 集群作业
        if (!this.room._hasRunLab) {
            this.runLab()
            this.room._hasRunLab = true
        }

        // 如果是 outLab 就更新下自己的库存到 memory
        if (this.id in this.room.memory.lab.outLab) this.room.memory.lab.outLab[this.id] = this.store[this.mineralType] | 0
    }

    /**
     * lab 集群的工作总入口
     */
    private runLab(): void {
        switch (this.room.memory.lab.state) {
            case LAB_STATE.GET_TARGET: 
                if (Game.time % 10) return
                this.labGetTarget()
            break
            case LAB_STATE.GET_RESOURCE:
                if (Game.time % 15) return
                this.labGetResource()
            break
            case LAB_STATE.WORKING:
                if (Game.time % 2) return
                this.labWorking()
            break
            case LAB_STATE.PUT_RESOURCE:
                if (Game.time % 15) return
                this.labPutResource()
            break
            case LAB_STATE.BOOST:
                if (Game.time % 5) return
                this.boostController()
            break
            default:
                if (Game.time % 10) return
                this.labGetTarget()
            break
        }
    }

    /**
     * boost - 流程控制器
     */
    private boostController(): void {
        switch (this.room.memory.boost.state) {
            case 'boostGet': 
                this.boostGetResource()
            break
            case 'labGetEnergy':
                this.boostGetEnergy()
            break
            case 'waitBoost':
                // 感受宁静
            break
            case 'boostClear':
                this.boostClear()
            break
            default:
                this.boostGetResource()
            break
        }
    }

    /**
     * boost 阶段：获取强化材料
     */
    private boostGetResource(): void {        
        // 获取 boost 任务
        const boostTask = this.room.memory.boost

        // 遍历检查资源是否到位
        let allResourceReady = true
        for (const res of BOOST_RESOURCE[boostTask.type]) {
            const lab = Game.getObjectById<StructureLab>(boostTask.lab[res])
            if (!lab) continue

            // 有的资源还没到位
            if (lab.store[res] <= 0) allResourceReady = false
        }

        // 都就位了就进入下一个阶段
        if (allResourceReady) {
            this.log(`boost 材料准备完成，开始填充能量`, 'green')
            this.room.memory.boost.state = 'labGetEnergy'
        }
        // 否则就发布任务
        else if (!this.room.hasRoomTransferTask(ROOM_TRANSFER_TASK.BOOST_GET_RESOURCE)) {
            this.room.addRoomTransferTask({
                type: ROOM_TRANSFER_TASK.BOOST_GET_RESOURCE
            })
        }
    }

    /**
     * boost 阶段：获取能量
     */
    private boostGetEnergy(): void {        
        const boostTask = this.room.memory.boost

        // 遍历所有执行强化的 lab
        for (const resourceType in boostTask.lab) {
            const lab = Game.getObjectById<StructureLab>(boostTask.lab[resourceType])

            // 有 lab 能量不达标的话就发布能量填充任务
            if (lab && lab.store[RESOURCE_ENERGY] < 1000) {
                // 有 lab 能量不满的话就发布任务
                this.room.addRoomTransferTask({
                    type: ROOM_TRANSFER_TASK.BOOST_GET_ENERGY
                })
                return
            }
        }

        // 能循环完说明能量都填好了
        this.room.memory.boost.state = 'waitBoost'
        this.log(`能量填充完成，boost 准备就绪，等待强化，键入 ${this.room.name}.whelp() 来查看如何孵化战斗单位`, 'green')
    }

    /**
     * boost 阶段：回收材料
     * 将强化用剩下的材料从 lab 中转移到 terminal 中
     */
    private boostClear(): void {
        // 所有执行强化的 labId
        const boostLabs = Object.values(this.room.memory.boost.lab)

        // 检查是否存在没搬空的 lab
        for (const labId of boostLabs) {
            const lab = Game.getObjectById<StructureLab>(labId)
            // mineralType 不为空就说明还有资源没拿出来
            if (lab && lab.mineralType) {
                // 发布任务
                this.room.addRoomTransferTask({
                    type: ROOM_TRANSFER_TASK.BOOST_CLEAR
                })
                return
            }
        }

        // 检查是否有 boostGetResource 任务存在
        // 这里检查它的目的是防止 transfer 还在执行 BOOST_GET_RESOURCE 任务，如果过早的完成 boost 进程的话
        // 就会出现 lab 集群已经回到了 GET_TARGET 阶段但是 lab 里还有材料存在
        if (this.room.hasRoomTransferTask(ROOM_TRANSFER_TASK.BOOST_GET_RESOURCE)) return
        // lab 净空并且 boost clear 物流任务完成，就算是彻底完成了 boost 进程
        else if (!this.room.hasRoomTransferTask(ROOM_TRANSFER_TASK.BOOST_CLEAR)) {
            this.log(`材料回收完成`, 'green')
            delete this.room.memory.boost
            if (this.room.memory.lab) this.room.memory.lab.state = LAB_STATE.GET_TARGET
        }
    }

    /**
     * lab 阶段：获取全局目标
     */
    private labGetTarget(): void {
        // 如果有 boost 任务的话就优先执行
        if (this.room.memory.boost) {
            this.room.memory.lab.state = LAB_STATE.BOOST
            return
        }
        
        // 获取目标
        if (!this.room.memory.lab.targetIndex) this.room.memory.lab.targetIndex = 0
        const resource = labTarget[this.room.memory.lab.targetIndex]

        // 如果 targetIndex 没有找到对应资源的话，就更新索引再试一次
        // 一般都是因为修改了 labTarget 导致的
        if (!resource) {
            this.setNextIndex()
            return
        }

        // 检查目标资源数量是否已经足够
        if (!this.room.terminal) return this.log(`错误! 找不到终端`, 'red')
        if (this.room.terminal.store[resource.target] >= resource.number) {
            this.setNextIndex()
            return
        }
        
        // 确认是否可以合成
        const canReactionAmount = this.labAmountCheck(resource.target)
        // 可以合成
        if (canReactionAmount > 0) {
            this.room.memory.lab.state = LAB_STATE.GET_RESOURCE
            // 单次作业数量不能超过 lab 容量上限
            this.room.memory.lab.targetAmount = canReactionAmount > LAB_MINERAL_CAPACITY ? LAB_MINERAL_CAPACITY : canReactionAmount
            this.log(`指定目标：${resource.target}`)
        }
        // 合成不了
        else {
            // this.log(`无法合成 ${resource.target}`, 'yellow')
            this.setNextIndex()
        }
    }

    /**
     * lab 阶段：获取底物
     */
    private labGetResource(): void {
        // 检查是否有能量移入任务
        if (this.room.hasRoomTransferTask(ROOM_TRANSFER_TASK.LAB_IN)) return

        // 检查 InLab 底物数量，都有底物的话就进入下个阶段
        const inLabs = this.room.memory.lab.inLab.map(labId => Game.getObjectById(labId) as StructureLab)
        const hasEmptyLab = inLabs.find(lab => !lab.mineralType)
        if (!hasEmptyLab) {
            this.room.memory.lab.state = LAB_STATE.WORKING
            return
        }

        // 获取终端
        const termial = this.room.terminal
        if (!termial) return this.log(`错误! 找不到终端`, 'red')

        // 检查底物是否足够
        const targetResource = labTarget[this.room.memory.lab.targetIndex].target
        const hasInsufficientResource = reactionSource[targetResource].find(res => termial.store[res] < this.room.memory.lab.targetAmount)

        // 有不足的底物, 重新查找目标
        if (hasInsufficientResource) {
            this.room.memory.lab.state = LAB_STATE.GET_TARGET
            this.setNextIndex()
        }
        // 没有就正常发布底物填充任务
        else this.addTransferTask(ROOM_TRANSFER_TASK.LAB_IN)
    }

    /**
     * lab 阶段：进行反应
     */
    private labWorking(): void {
        const labMemory = this.room.memory.lab

        // 还没冷却好
        if (labMemory.reactionRunTime && Game.time < labMemory.reactionRunTime) return

        // 获取 inLab
        let inLabs: StructureLab[] = []
        labMemory.inLab.forEach(labId => {
            const lab = Game.getObjectById(labId) as StructureLab
            if (!lab) this.log(`错误! 找不到 inLab ${labId}`, 'red')
            else inLabs.push(lab)
        })
        if (inLabs.length < 2) return

        // 遍历 outLab 执行反应
        for (const labId in labMemory.outLab) {
            const outLab = Game.getObjectById(labId) as StructureLab
            // 兜底
            if (!outLab) {
                this.log(`错误! 找不到 outLab ${labId}, 已将其移除`, 'red')
                delete this.room.memory.lab.outLab[labId]
                continue
            }

            const runResult = outLab.runReaction(inLabs[0], inLabs[1])

            // 由于 runReaction 之后要等到下个 tick 才能获取到 cooldown 信息
            // 所以一旦发现有 lab 进入冷却后就说明其他的 outLab 也在冷却了
            if (runResult === ERR_TIRED) {
                this.room.memory.lab.reactionRunTime = Game.time + outLab.cooldown
                return
            }
            // 底物不足的话就进入下个阶段
            else if (runResult === ERR_NOT_ENOUGH_RESOURCES) {
                this.room.memory.lab.state = LAB_STATE.PUT_RESOURCE
                return
            }
            else if (runResult !== OK) {
                this.log(`runReaction 异常，错误码 ${runResult}`, 'red')
            }
        }
    }

    /**
     * lab 阶段：移出产物
     */
    private labPutResource(): void {
        // 检查是否已经有正在执行的移出任务嘛
        if (this.room.hasRoomTransferTask(ROOM_TRANSFER_TASK.LAB_OUT)) return

        // 检查资源有没有全部转移出去
        for (const labId in this.room.memory.lab.outLab) {
            if (this.room.memory.lab.outLab[labId] > 0) {
                // 没有的话就发布移出任务
                this.addTransferTask(ROOM_TRANSFER_TASK.LAB_OUT)
                return
            }
        }

        // 都移出去的话就可以开始新的轮回了
        this.room.memory.lab.state = LAB_STATE.GET_TARGET
        delete this.room.memory.lab.targetAmount
        this.setNextIndex()
    }

    /**
     * 将 lab.targetIndex 设置到下一个目标
     * 
     * @returns 当前的目标索引
     */
    private setNextIndex(): number {
        this.room.memory.lab.targetIndex = (this.room.memory.lab.targetIndex + 1 >= labTarget.length) ?
            0 : this.room.memory.lab.targetIndex + 1
        
        return this.room.memory.lab.targetIndex
    }

    /**
     * 查询目标资源可以合成的数量
     * 会查询 setting.ts 中的 reactionSource 来找到底物，然后在 terminal 中查找
     * 
     * @param resourceType 要查询的资源类型
     * @returns 可以合成的数量，为 0 代表无法合成
     */
    private labAmountCheck(resourceType: ResourceConstant): number {
        // 获取资源及其数量, 并将数量从小到大排序
        const needResourcesName = reactionSource[resourceType]
        if (!needResourcesName) {
            this.log(`reactionSource 中未定义 ${resourceType}`, 'yellow')
            return 0
        }
        const needResources = needResourcesName
            .map(res => this.room.terminal.store[res] | 0)
            .sort((a, b) => a - b)

        // 找到能被5整除的最大底物数量
        if (needResources.length <= 0) return 0
        return needResources[0] - (needResources[0] % 5)
    }

    /**
     * 向房间物流队列推送任务
     * 任务包括：in(底物填充)、out(产物移出)
     * 
     * @param taskType 要添加的任务类型
     * @returns 是否成功添加了物流任务
     */
    private addTransferTask(taskType: string): boolean {
        const labMemory = this.room.memory.lab
        // 底物移入任务
        if (taskType == ROOM_TRANSFER_TASK.LAB_IN) {
            // 获取目标产物
            const targetResource = labTarget[this.room.memory.lab.targetIndex].target
            // 获取底物及其数量
            const resource = reactionSource[targetResource].map((res, index) => ({
                id: this.room.memory.lab.inLab[index],
                type: <ResourceConstant>res,
                amount: this.room.memory.lab.targetAmount
            }))

            // 发布任务
            return (this.room.addRoomTransferTask({
                type: ROOM_TRANSFER_TASK.LAB_IN,
                resource: resource
            }) == -1) ? false : true
        }
        // 产物移出任务
        else if (taskType == ROOM_TRANSFER_TASK.LAB_OUT) {
            // 获取还有资源的 lab, 将其内容物类型作为任务的资源类型
            let targetLab: StructureLab
            for (const outLabId in labMemory.outLab) {
                if (labMemory.outLab[outLabId] > 0) {
                    targetLab = Game.getObjectById(outLabId)
                    break
                }
            }
            if (!targetLab) return false

            // 发布任务
            return (this.room.addRoomTransferTask({
                type: ROOM_TRANSFER_TASK.LAB_OUT,
                resourceType: targetLab.mineralType
            }) == -1) ? false : true
        }
        else return false
    }
}