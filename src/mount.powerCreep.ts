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
        // console.log(this.name, this.ticksToLive, this.spawnCooldownTime)
        // 凉了就尝试生成
        if (!this.ticksToLive) {
            // 还在冷却就等着
            if (!this.spawnCooldownTime) {
                // 请求指定工作房间
                if (!this.memory.workRoom) console.log(`[${this.name}] 请使用下述命令为该 powerCreep 指定工作房间:\n  Game.powerCreeps['${this.name}'].setWorkRoom('roomname')`)
                // 或者直接出生在指定房间
                else this.spawnAtRoom(this.memory.workRoom)
            }

            return
        }

        // 获取队列中的第一个任务并执行
        const powerTask = this.room.getPowerTask() | PWR_GENERATE_OPS
        // 没有任务的话就搓 ops
        this.executeTask(powerTask as PowerConstant)
    }

    /**
     * 处理当前的 power 任务
     */
    private executeTask(task: PowerConstant): void {
        const taskOptioon = PowerTasks[task]
        if (!taskOptioon && task !== PWR_GENERATE_OPS) return this.room.deleteCurrentPowerTask()

        // 根据 working 字段觉得是执行 source 还是 target
        // working 的值由上个 tick 执行的 source 或者 target 的返回值决定
        if (this.memory.working) {
            const result = taskOptioon.target(this)

            // target 返回 OK 才代表任务完成了
            if (result === OK && task !== PWR_GENERATE_OPS) this.room.deleteCurrentPowerTask()
            // target 资源不足了就去执行 source
            else if (result === ERR_NOT_ENOUGH_RESOURCES) this.memory.working = false
        }
        else {
            const result = taskOptioon.source(this)
            
            // source OK 了代表资源获取完成，去执行 target
            if (result === OK) this.memory.working = true
            // 如果 source 还发现没资源的话就强制执行 ops 生成任务
            else if (result === ERR_NOT_ENOUGH_RESOURCES) this.memory.task = PWR_GENERATE_OPS
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
    public setWorkRoom(roomName: string): string {
        let result: string = this.memory.workRoom ? 
            `[${this.name}] 已将工作房间从 ${this.memory.workRoom} 重置为 ${roomName}` : 
            `[${this.name}] 已将工作房间设置为 ${roomName}`
        
        this.memory.workRoom = roomName

        return result
    }

    /**
     * 前往 controller 启用房间中的 power
     */
    public enablePower(): void {
        if (this.enableRoom(this.room.controller) === ERR_NOT_IN_RANGE) {
            this.goTo(this.room.controller.pos)
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
     * 生成 ops 并存放至 terminal
     * 注意，PWR_GENERATE_OPS 任务永远不会返回 OK，没有其他任务来打断它就会一直执行
     */
    [PWR_GENERATE_OPS]: {
        /**
         * 搓 ops，搓够指定数量就存一下
         */
        source: creep => {
            // 如果没办法搓的话就把自己锁死在这个状态，等待玩家解决
            if (!creep.powers[PWR_GENERATE_OPS]) {
                creep.say('我搓不出来啊')
                return ERR_BUSY
            }

            // 冷却好了就搓一下
            if (creep.powers[PWR_GENERATE_OPS].cooldown === 0) {
                const actionResult = creep.usePower(PWR_GENERATE_OPS)

                // 如果
                if (actionResult === ERR_INVALID_ARGS) creep.enablePower()
                else if (actionResult !== OK) console.log(`[${creep.name}] ops 生成异常, 错误码: ${actionResult}`)
                
                return ERR_BUSY
            }

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
    }
}