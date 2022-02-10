import { goTo, setWayPoint } from '@/modulesGlobal/move'
import { Color } from '@/utils'
import { getNearSite } from '@/mount/global/construction'
import { MoveOpt } from '@/modulesGlobal/move/types'

// creep 原型拓展
export default class CreepExtension extends Creep {
    /**
     * 发送日志
     *
     * @param content 日志内容
     * @param instanceName 发送日志的实例名
     * @param color 日志前缀颜色
     * @param notify 是否发送邮件
     */
    log (content: string, color: Color = undefined, notify = false): void {
        this.room.log(content, this.name, color, notify)
    }

    /**
     * 切换为能量获取状态
     * 应在 target 阶段能量不足时调用
     *
     * @param creep 需要获取能量的 creep
     * @returns true
     */
    backToGetEnergy (): true {
        // 移除能量来源缓存，便于重新查找最近的
        delete this.memory.sourceId
        return true
    }

    /**
     * 无视 Creep 的寻路
     *
     * @param target 要移动到的位置
     */
    public goTo (target?: RoomPosition, moveOpt?: MoveOpt): ScreepsReturnCode {
        return goTo(this, target, moveOpt)
    }

    /**
     * 设置路径点
     *
     * @see doc/移动及寻路设计案
     * @param target 要进行设置的目标，位置字符串数组或者是路径名前缀
     */
    public setWayPoint (target: string[] | string): ScreepsReturnCode {
        return setWayPoint(this, target)
    }

    /**
     * 填充指定房间的 controller
     */
    public upgradeRoom (roomName: string): ScreepsReturnCode {
        const workRoom = Game.rooms[roomName]
        if (!workRoom) {
            this.goTo(new RoomPosition(25, 25, roomName), { checkTarget: false })
            return ERR_NOT_IN_RANGE
        }
        const result = this.upgradeController(workRoom.controller)

        if (result === ERR_NOT_IN_RANGE) this.goTo(workRoom.controller.pos)
        return result
    }

    /**
     * 建设房间内存在的建筑工地
     */
    public buildRoom (roomName: string): CreepActionReturnCode | ERR_NOT_ENOUGH_RESOURCES | ERR_RCL_NOT_ENOUGH | ERR_NOT_FOUND {
        const inWorkRoom = this.room.name === roomName
        const roomPos = inWorkRoom ? this.pos : new RoomPosition(25, 25, roomName)
        // 搜索目标工地
        const target = getNearSite(roomPos)

        // 找不到目标就判断下，如果不在房间内就走过去，在房间内还没有目标才是真没目标
        if (!target) {
            if (!inWorkRoom) {
                this.goTo(roomPos, { range: 3 })
                return OK
            }
            return ERR_NOT_FOUND
        }
        // 上面发现有墙要刷了，这个 tick 就不再造建造了
        // 防止出现造好一个 rampart，然后直接造下一个 rampart，造好后又扭头去刷第一个 rampart 的小问题出现
        if (this.memory.fillWallId) return ERR_BUSY

        // 建设
        const buildResult = this.build(target)

        if (buildResult === ERR_NOT_IN_RANGE) this.goTo(target.pos, { range: 3 })
        return buildResult
    }

    /**
     * 从目标结构获取能量
     *
     * @param target 提供能量的结构
     * @returns 执行 harvest 或 withdraw 后的返回值
     */
    public getEngryFrom (target: AllEnergySource): ScreepsReturnCode {
        let result: ScreepsReturnCode
        // 是建筑就用 withdraw
        if (target instanceof Structure) {
            // 如果建筑里没能量了就不去了，防止出现粘性
            if (target.store[RESOURCE_ENERGY] <= 0) return ERR_NOT_ENOUGH_ENERGY
            result = this.withdraw(target as Structure, RESOURCE_ENERGY)
        }
        else if (target instanceof Resource) result = this.pickup(target as Resource)
        // 不是的话就用 harvest
        else result = this.harvest(target as Source)

        if (result === ERR_NOT_IN_RANGE) this.goTo(target.pos, { range: 1 })

        return result
    }

    /**
     * 转移资源到建筑
     * 包含移动逻辑
     *
     * @param target 要转移到的目标
     * @param RESOURCE 要转移的资源类型
     */
    public transferTo (target: AnyCreep | Structure, RESOURCE: ResourceConstant, moveOpt: MoveOpt = {}): ScreepsReturnCode {
        this.goTo(target.pos, moveOpt)
        return this.transfer(target, RESOURCE)
    }
}
