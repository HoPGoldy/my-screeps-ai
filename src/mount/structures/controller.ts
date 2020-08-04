import { creepApi } from 'modules/creepController'
import { whiteListFilter } from 'utils'

/**
 * Controller 拓展
 * 统计当前升级进度、移除无效的禁止通行点位
 */
export default class ControllerExtension extends StructureController {
    public work(): void {
        if (Game.time % 20) return

        // 如果等级发生变化了就运行 creep 规划
        if (this.stateScanner()) this.onLevelChange(this.level)

        // 8 级并且快掉级了就孵化 upgrader
        if (this.level === 8 && this.ticksToDowngrade <= 100000) creepApi.add(`${this.room.name} upgrader1`, 'upgrader', {
            sourceId: this.room.storage.id
        }, this.room.name)

        // 检查外矿有没有被入侵的，有的话是不是可以重新发布 creep 了
        if (this.room.memory.remote) {
            for (const remoteRoomName in this.room.memory.remote) {
                // 如果发现入侵者已经老死了，就移除对应属性并重新发布外矿角色组
                if (this.room.memory.remote[remoteRoomName].disableTill <= Game.time) {
                    delete this.room.memory.remote[remoteRoomName].disableTill
                    this.room.addRemoteCreepGroup(remoteRoomName)
                }
            }
        }
    }

    /**
     * 当等级发生变化时的回调函数
     * 
     * @param level 当前的等级
     */
    public onLevelChange(level: number): void {
        // 刚占领，添加最基础的角色组
        if (level === 1) {
            this.room.releaseCreep('harvester')
            // 多发布一个 build 协助建造
            this.room.releaseCreep('builder')
        }

        // 规划布局
        this.log(this.room.planLayout(), 'green')
    }

    /**
     * 统计自己的等级信息
     * 
     * @returns 为 true 时说明自己等级发生了变化
     */
    private stateScanner(): boolean {
        let hasLevelChange = false
        if (!Memory.stats.rooms[this.room.name]) Memory.stats.rooms[this.room.name] = {}

        // 统计升级进度
        Memory.stats.rooms[this.room.name].controllerRatio = (this.progress / this.progressTotal) * 100

        // 统计房间等级
        if (Memory.stats.rooms[this.room.name].controllerLevel !== this.level) hasLevelChange = true
        Memory.stats.rooms[this.room.name].controllerLevel = this.level

        return hasLevelChange
    }

    /**
     * 检查敌人威胁
     * 检查房间内所有敌人的身体部件情况确认是否可以造成威胁
     * 
     * @returns 是否可以造成威胁（是否启用主动防御模式）
     */
    public checkEnemyThreat(): boolean {
        // 这里并没有搜索 PC，因为 PC 不是敌人主力
        const enemy = this.room._enemys || this.room.find(FIND_HOSTILE_CREEPS, {
            filter: whiteListFilter
        })
        if (enemy.length <= 0) return false

        // 如果来的都是入侵者的话，就算撑破天了也不管
        if (!enemy.find(creep => creep.owner.username !== 'Invader')) return false

        const bodyNum = enemy.map(creep => {
            // 如果是 creep 则返回身体部件，如果不是则不参与验证
            return creep instanceof Creep ? creep.body.length : 0
        }).reduce((pre, cur) => pre + cur)
        // 满配 creep 数量大于 1，就启动主动防御
        return bodyNum > MAX_CREEP_SIZE
    }
}