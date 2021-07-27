import { Color, log } from "@/modulesGlobal"
import { MoveOpt } from "@/modulesGlobal/move/types"


/**
 * PowerCreep 原型拓展
 * 遍历自己的 powers，并执行相应任务
 */
export default class PowerCreepExtension extends PowerCreep {
    public onWork(): void {
        if (!this.keepAlive()) return

        // 上班了！执行房间 power 任务
        this.room.power.runManager(this)
    }

    /**
     * 发送日志
     * 
     * @param content 日志内容
     * @param instanceName 发送日志的实例名
     * @param color 日志前缀颜色
     * @param notify 是否发送邮件
     */
    log(content: string, color: Color = undefined, notify: boolean = false): void {
        // 因为 pc 可能未孵化，所以这里需要特别判断一下
        if (!this.room) log(content, [ this.name ], color, notify)
        else this.room.log(content, this.name, color, notify)
    }

    /**
     * 保证自己一直活着
     * 
     * @returns 是否可以执行后面的工作
     */
    private keepAlive(): boolean {
        // 离死还早，继续工作
        if (this.ticksToLive > 100) return true

        // 快凉了就尝试重生
        if (this.ticksToLive <= 100) {
            // 如果工作房间被更改的话就不进行 renew
            // 等到冷却完成后会自动复活到 workRoom 
            if (this.memory.workRoom !== this.room.name) return true

            this.say('插座在哪！')
            if (this.room.power.renew(this) === OK) return false
        }

        // 执行到这里就说明是真凉了，如果在冷却的话就等着
        if (this.spawnCooldownTime) return false

        // 请求指定工作房间
        if (!this.memory.workRoom) {
            this.log(`请使用该命令来指定工作房间（房间名置空以关闭提示）：Game.powerCreeps['${this.name}'].setWorkRoom('roomname')`)
            return false
        }

        // 可以复活了
        if (this.memory.workRoom != 'hideTip') this.spawnAtRoom(this.memory.workRoom)
        return false
    }

    /**
     * 在指定房间重生自己
     * 
     * @param roomName 要生成到的房间名
     * @returns OK 生成成功
     * @returns ERR_INVALID_ARGS 该房间没有视野
     * @returns ERR_NOT_FOUND 该房间不存在或者其中没有 PowerSpawn
     */
    private spawnAtRoom(roomName: string): OK | ERR_INVALID_ARGS | ERR_NOT_FOUND {
        const targetRoom = Game.rooms[roomName]
        if (!targetRoom || !targetRoom.powerSpawn) {
            this.log(`找不到指定房间或者房间内没有 powerSpawn，请重新指定工作房间`)
            return ERR_NOT_FOUND
        }

        const spawnResult = this.spawn(targetRoom.powerSpawn)

        if (spawnResult === OK) {
            targetRoom.power.addSkill(this)
            return OK
        }
        else {
            this.log(`孵化异常! 错误码: ${spawnResult}`, Color.Yellow)
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
     * 以下为对穿移动的相关方法，直接执行 Creep 原型上的对应方法
     */

    public goTo(target?: RoomPosition, moveOpt?: MoveOpt): ScreepsReturnCode {
        return Creep.prototype.goTo.call(this, target, moveOpt)
    }

    public setWayPoint(target: string[] | string): ScreepsReturnCode {
        return Creep.prototype.setWayPoint.call(this, target)
    }
}
