// 挂载拓展到 PowerCreep 原型
export default function () {
    if (!PowerCreep.prototype._move) PowerCreep.prototype._move = Creep.prototype._move

    _.assign(PowerCreep.prototype, PowerCreepExtension.prototype)
}

/**
 * PowerCreep 原型拓展
 * 遍历自己的 powers，并执行相应任务
 */
class PowerCreepExtension extends PowerCreep {
    public work(): void {
        if (!this.keepAlive()) return

        // 获取队列中的第一个任务并执行
        // 没有任务的话就搓 ops
        const powerTask = this.room.getPowerTask() || PWR_GENERATE_OPS
        this.executeTask(powerTask as PowerConstant)
    }

    /**
     * 保证自己一直活着
     * 
     * @returns 是否可以执行后面的工作
     */
    private keepAlive(): boolean {
        // 快凉了就尝试重生
        if (this.ticksToLive <= 100) {
            // 如果工作房间被更改的话就不进行 renew
            // 等到冷却完成后会自动复活到 workRoom 
            if (this.memory.workRoom !== this.room.name) return true

            this.say('插座在哪！')
            if (this.renewSelf() === OK) return false
        }
        // 真凉了就尝试生成
        if (!this.ticksToLive) {
            // 还在冷却就等着
            if (!this.spawnCooldownTime) {
                // 请求指定工作房间
                if (!this.memory.workRoom) console.log(`[${this.name}] 请使用该命令来指定工作房间（房间名置空以关闭提示）：Game.powerCreeps['${this.name}'].setWorkRoom('roomname')`)
                // 或者直接出生在指定房间
                else if (this.memory.workRoom != 'hideTip') this.spawnAtRoom(this.memory.workRoom)
            }

            return false
        }

        return true
    }

    /**
     * 处理当前的 power 任务
     */
    private executeTask(task: PowerConstant): void {
        // 没有该 power 就直接移除任务
        if (!this.powers[task]) return this.finishTask()
        // 没冷却好就暂时挂起任务
        if (this.powers[task].cooldown > 0) {
            // 任务是搓 ops 的话就不用挂起
            if (task !== PWR_GENERATE_OPS) this.room.hangPowerTask()
            return
        }

        // 获取任务执行逻辑
        const taskOptioon = PowerTasks[task]
        if (!taskOptioon && task !== PWR_GENERATE_OPS) {
            this.say(`不认识任务 ${task}`)
            console.log(`[${this.room.name}][powerCreep ${this.name}] 没有和任务 [${task}] 对应的处理逻辑，任务已移除`)
            return this.finishTask()
        }

        // 根据 working 字段觉得是执行 source 还是 target
        // working 的值由上个 tick 执行的 source 或者 target 的返回值决定
        if (this.memory.working == undefined || this.memory.working) {
            const result = taskOptioon.target(this)

            // target 返回 OK 才代表任务完成了
            if (result === OK && task !== PWR_GENERATE_OPS) this.finishTask()
            // target 资源不足了就去执行 source
            else if (result === ERR_NOT_ENOUGH_RESOURCES) this.memory.working = false
        }
        else {
            const result = taskOptioon.source(this)
            
            // source OK 了代表资源获取完成，去执行 target
            if (result === OK) this.memory.working = true
            // 如果 source 还发现没资源的话就强制执行 ops 生成任务
            // 这里调用了自己，但是由于 PWR_GENERATE_OPS 的 source 阶段永远不会返回 ERR_NOT_ENOUGH_RESOURCES
            // 所以不会产生循环调用
            else if (result === ERR_NOT_ENOUGH_RESOURCES) this.executeTask(PWR_GENERATE_OPS)
        }
    }

    /**
     * 在指定房间生成自己
     * 
     * @param roomName 要生成的房间名
     * @returns OK 生成成功
     * @returns ERR_INVALID_ARGS 该房间没有视野
     * @returns ERR_NOT_FOUND 该房间不存在或者其中没有 PowerSpawn
     */
    private spawnAtRoom(roomName: string): OK | ERR_INVALID_ARGS | ERR_NOT_FOUND {
        const targetRoom = Game.rooms[roomName]
        if (!targetRoom || !targetRoom.powerSpawn) {
            console.log(`[${this.name}] 找不到指定房间或者房间内没有 powerSpawn，请重新指定工作房间`)
            return ERR_NOT_FOUND
        }

        const spawnResult = this.spawn(targetRoom.powerSpawn)
        
        if (spawnResult === OK) return OK
        else {
            console.log(`[${this.name}] 孵化异常! 错误码: ${spawnResult}`)
            return ERR_INVALID_ARGS
        }
    }

    /**
     * 给 powerCreep 指定工作房间
     * 
     * @param roomName 要进行生成的房间名
     */
    public setWorkRoom(roomName: string = 'hideTip'): string {
        let result: string = this.memory.workRoom ? 
            `[${this.name}] 已将工作房间从 ${this.memory.workRoom} 重置为 ${roomName}, 将会在老死后复活在目标房间` : 
            `[${this.name}] 已将工作房间设置为 ${roomName}`
        
        if (roomName === 'hideTip') result = `[${this.name}] 已关闭提示，重新执行该命令来孵化此 powerCrep`
        
        this.memory.workRoom = roomName

        return result
    }

    /**
     * 前往 controller 启用房间中的 power
     * 
     * @returns OK 激活完成
     * @returns ERR_BUSY 正在激活中
     */
    public enablePower(): OK | ERR_BUSY {
        this.say('正在启用 Power')

        const result = this.enableRoom(this.room.controller)
        if (result === OK) return OK
        else if (result === ERR_NOT_IN_RANGE) {
            this.goTo(this.room.controller.pos)
        }
        return ERR_BUSY
    }

    /**
     * 找到房间中的 powerSpawn renew 自己
     * 
     * @returns OK 正在执行 renew
     * @returns ERR_NOT_FOUND 房间内没有 powerSpawn
     */
    private renewSelf(): OK | ERR_NOT_FOUND {
        if (!this.room.powerSpawn) return ERR_NOT_FOUND

        if (this.renew(this.room.powerSpawn) === ERR_NOT_IN_RANGE) {
            this.goTo(this.room.powerSpawn.pos)
        }
        return OK
    }

    /**
     * 完成当前任务
     * 会确保下个任务开始时执行 target 阶段
     */
    private finishTask(): void {
        this.memory.working = true
        this.room.deleteCurrentPowerTask()
    }

    /**
     * 从 terminal 中取出 ops
     * 
     * @param opsNumber 要拿取的数量
     * @returns OK 拿取完成
     * @returns ERR_NOT_ENOUGH_RESOURCES 资源不足
     * @returns ERR_BUSY 正在执行任务
     */
    public getOps(opsNumber: number): OK | ERR_NOT_ENOUGH_RESOURCES | ERR_BUSY {
        // 身上的够用就不去 terminal 拿了
        if (this.store[RESOURCE_OPS] > opsNumber) return OK

        let sourceStructure: StructureTerminal | StructureStorage = undefined
        // 如果资源够的话就使用 terminal 作为目标
        if (this.room.terminal && this.room.terminal.store[RESOURCE_OPS] >= opsNumber) sourceStructure = this.room.terminal
        else return ERR_NOT_ENOUGH_RESOURCES

        // 拿取指定数量的 ops
        const actionResult = this.withdraw(sourceStructure, RESOURCE_OPS, opsNumber)

        // 校验
        if (actionResult === OK) return OK
        else if (actionResult === ERR_NOT_IN_RANGE) {
            this.goTo(sourceStructure.pos)
            return ERR_BUSY
        }
        else {
            console.log(`[${this.room.name} ${this.name}] 执行 getOps 时出错，错误码 ${actionResult}`)
            return ERR_BUSY
        }
    }

    /**
     * 以下为对穿移动的相关方法，直接执行 Creep 原型上的对应方法
     */
    
    public move(target: DirectionConstant | Creep): CreepMoveReturnCode | ERR_INVALID_TARGET | ERR_NOT_IN_RANGE {
        return Creep.prototype.move.call(this, target)
    }
    public goTo(target: RoomPosition): CreepMoveReturnCode | ERR_NO_PATH | ERR_INVALID_TARGET | ERR_NOT_FOUND {
        return Creep.prototype.goTo.call(this, target)
    }
    public requireCross(direction: DirectionConstant): Boolean {
        return Creep.prototype.requireCross.call(this, direction)
    }
    private mutualCross(direction: DirectionConstant): OK | ERR_BUSY | ERR_NOT_FOUND {
        return Creep.prototype.mutualCross.call(this, direction)
    }
}

/**
 * 所有 power 的任务检查逻辑及工作逻辑
 * 
 * @property PWR_* 常量之一，代表对应的任务
 * @value power 任务的具体配置项
 */
const PowerTasks: IPowerTaskConfigs = {
    /**
     * 房间初始化任务，会在房间 power 任务队列初始化时同时添加
     * 该任务必定未房间的第一个 power 任务
     */
    [-1]: {
        target: creep => creep.enablePower()
    },

    /**
     * 生成 ops 并存放至 terminal
     * 注意，PWR_GENERATE_OPS 任务永远不会返回 OK，没有其他任务来打断它就会一直执行
     */
    [PWR_GENERATE_OPS]: {
        /**
         * 搓 ops，搓够指定数量就存一下
         */
        source: creep => {
            const actionResult = creep.usePower(PWR_GENERATE_OPS)

            // 如果
            if (actionResult === ERR_INVALID_ARGS) creep.enablePower()
            else if (actionResult !== OK) console.log(`[${creep.name}] ops 生成异常, 错误码: ${actionResult}`)

            // 数量够了就 target
            if (creep.store[RESOURCE_OPS] > 5) return OK
        },
        /**
         * 把 ops 存到 terminal 里
         */
        target: creep => {
            // 塞不进去就乐观点，继续干其他的活
            if (!creep.room.terminal || creep.room.terminal.store.getFreeCapacity() < 5) return OK

            const transferResult = creep.transfer(creep.room.terminal, RESOURCE_OPS)

            // 够不到就移动
            if (transferResult == ERR_NOT_IN_RANGE) {
                creep.goTo(creep.room.terminal.pos)
                return ERR_BUSY
            }
            // ops 不足就继续生成
            else if (transferResult == ERR_NOT_ENOUGH_RESOURCES){
                return ERR_NOT_ENOUGH_RESOURCES
            }
        }
    },

    /**
     * 填充 extension
     */
    [PWR_OPERATE_EXTENSION]: {
        // 获取能量
        source: creep => creep.getOps(POWER_INFO[PWR_OPERATE_EXTENSION].ops),
        // 进行填充
        target: creep => {
            // 资源不足直接执行 source
            if (creep.store[RESOURCE_OPS] < POWER_INFO[PWR_OPERATE_EXTENSION].ops) return ERR_NOT_ENOUGH_RESOURCES

            // 获取能量来源
            let sourceStructure = undefined
            // 只有 storage 的话就用 storage
            if (creep.room.storage && !creep.room.terminal) sourceStructure = creep.room.storage
            // 两个都存在的话就比较那个能量多
            else if (creep.room.storage && creep.room.terminal) {
                sourceStructure = (creep.room.storage.store[RESOURCE_ENERGY] > creep.room.terminal.store[RESOURCE_ENERGY]) ? creep.room.storage : creep.room.terminal
            }
            // 只有 terminal 的话就用 terminal
            else if (!creep.room.storage && creep.room.terminal) sourceStructure = creep.room.terminal
            // 两个都不存在则直接完成任务
            else return OK

            const actionResult = creep.usePower(PWR_OPERATE_EXTENSION, sourceStructure)

            if (actionResult === OK) return OK
            else if (actionResult === ERR_NOT_IN_RANGE) creep.goTo(sourceStructure.pos)
            else {
                console.log(`[${creep.room.name} ${creep.name}] 执行 PWR_OPERATE_EXTENSION target 时出错，错误码 ${actionResult}`)
                return OK
            }
        }
    },

    /**
     * 强化 factory
     */
    [PWR_OPERATE_FACTORY]: {
        source: creep => creep.getOps(POWER_INFO[PWR_OPERATE_FACTORY].ops),
        target: creep => {
            // 资源不足直接执行 source
            if (creep.store[RESOURCE_OPS] < POWER_INFO[PWR_OPERATE_FACTORY].ops) return ERR_NOT_ENOUGH_RESOURCES

            // 如果自己的 power 等级和工厂等级对不上
            if (creep.powers[PWR_OPERATE_FACTORY].level !== creep.room.memory.factory.level) {
                console.log(`[${creep.room.name} ${creep.name}] 自身 PWR_OPERATE_FACTORY 等级(${creep.powers[PWR_OPERATE_FACTORY].level})与工厂设置等级(${creep.room.memory.factory.level})不符，拒绝强化，任务已移除`)
                return OK
            }

            const actionResult = creep.usePower(PWR_OPERATE_FACTORY, creep.room.factory)

            if (actionResult === OK) return OK
            else if (actionResult === ERR_NOT_IN_RANGE) creep.goTo(creep.room.factory.pos)
            else {
                console.log(`[${creep.room.name} ${creep.name}] 执行 PWR_OPERATE_FACTORY target 时出错，错误码 ${actionResult}`)
                return OK
            }
        }
    }
}