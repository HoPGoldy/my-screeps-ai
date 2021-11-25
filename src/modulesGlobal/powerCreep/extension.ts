import { Color, log } from '@/utils'
import { MoveOpt } from '@/modulesGlobal/move/types'

/**
 * PowerCreep 原型拓展
 * 遍历自己的 powers，并执行相应任务
 */
export default class PowerCreepExtension extends PowerCreep {
    /**
     * 发送日志
     */
    log (content: string, color: Color = undefined, notify = false): void {
        // 因为 pc 可能未孵化，所以这里需要特别判断一下
        if (!this.room) log(content, this.name, color, notify)
        else this.room.log(content, this.name, color, notify)
    }

    /**
     * 给 powerCreep 指定工作房间
     * @param roomName 要进行生成的房间名
     */
    public setWorkRoom (roomName = 'hideTip'): string {
        let result: string = this.memory.workRoom
            ? `[${this.name}] 已将工作房间从 ${this.memory.workRoom} 重置为 ${roomName}, 将会在老死后复活在目标房间`
            : `[${this.name}] 已将工作房间设置为 ${roomName}`

        if (roomName === 'hideTip') result = `[${this.name}] 已关闭提示，重新执行该命令来孵化此 powerCrep`

        this.memory.workRoom = roomName

        return result
    }

    /**
     * 以下为对穿移动的相关方法，直接执行 Creep 原型上的对应方法
     */

    public goTo (target?: RoomPosition, moveOpt?: MoveOpt): ScreepsReturnCode {
        return Creep.prototype.goTo.call(this, target, moveOpt)
    }

    public setWayPoint (target: string[] | string): ScreepsReturnCode {
        return Creep.prototype.setWayPoint.call(this, target)
    }
}
