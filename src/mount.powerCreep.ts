// 挂载拓展到 PowerCreep 原型
export default function () {
    if (!Creep.prototype._move) Creep.prototype._move = Creep.prototype.move

    _.assign(PowerCreep.prototype, PowerCreepExtension.prototype)
}

/**
 * PowerCreep 原型拓展
 * 遍历自己的 powers，并执行相应任务
 */
class PowerCreepExtension extends PowerCreep {
    public work(): void {
        // 凉了就尝试生成
        if (!this.ticksToLive && this.spawnCooldownTime === 0) {
            // 请求指定工作房间
            if (!this.memory.workRoom) return console.log(`[${this.name}] 请使用下述命令为该 powerCreep 指定工作房间:\n  Game.powerCreeps['${this.name}'].setWorkRoom('roomname')`)
            else {
                this.spawnAtRoom(this.memory.workRoom)
            }
        }
    }

    public move(target: DirectionConstant | Creep): CreepMoveReturnCode | ERR_INVALID_TARGET | ERR_NOT_IN_RANGE {
        return Creep.prototype.move.call(this, target)
    }

    public goTo(target: RoomPosition): CreepMoveReturnCode | ERR_NO_PATH | ERR_INVALID_TARGET | ERR_NOT_FOUND {
        return Creep.prototype.goTo.call(this, target)
    }

    public requireCross(direction: DirectionConstant): Boolean {
        return Creep.prototype.requireCross.call(this, direction)
    }

    /**
     * 在指定房间生成自己
     * 
     * @param roomName 要生成的房间名
     * @returns OK 生成成功
     * @returns ERR_INVALID_ARGS 该房间没有视野
     * @returns ERR_NOT_FOUND 该房间没有 PowerSpawn
     */
    private spawnAtRoom(roomName: string): OK | ERR_INVALID_ARGS | ERR_NOT_FOUND {
        console.log(`[${this.name}] 进行生成！`)
        return OK
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
}

/**
 * 所有 power 的任务检查逻辑及工作逻辑
 * 
 * @property PWR_* 常量之一，代表对应的任务
 * @value power 任务的具体配置项
 */
const PowerTasks: IPowerTaskConfigs = {
    // 生成 ops 并存放至 terminal
    [PWR_GENERATE_OPS]: {
        /**
         * 确保 terminal 中的 ops 大于指定值
         */
        needExecute: creep => {
            if (!creep.room.terminal) return true

            // terminal 数量不够了
            if (creep.room.terminal.store[RESOURCE_OPS] >= 100) return false
        },
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
            if (creep.powers[PWR_GENERATE_OPS].cooldown == 0) {
                creep.usePower(PWR_GENERATE_OPS)
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

            if (transferResult == OK) {
                // 数量足够了就完成
                if (creep.room.terminal.store[RESOURCE_OPS] >= 100) return OK
                // 否则就继续搓
                else return ERR_NOT_ENOUGH_RESOURCES
            }
            else if (transferResult == ERR_NOT_IN_RANGE) {
                creep.moveTo(creep.room.terminal)
                return ERR_BUSY
            }
            else {
                creep.say(`ops ${transferResult}`)
                return ERR_BUSY
            }
        }
    }
}