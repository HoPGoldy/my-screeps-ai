import { whiteListFilter } from '@/utils'
import { setRoomStats, getRoomStats } from '@/modules/stats'
import { UPGRADER_WITH_ENERGY_LEVEL_8 } from '@/setting'
import { delayQueue } from '@/modules/delayQueue'
import { countEnergyChangeRatio } from '@/modules/energyUtils'
import { WORK_TASK_PRIOIRY } from '@/modules/room/task/work/constant'

/**
 * Controller 拓展
 */
export default class ControllerExtension extends StructureController {
    public onWork(): void {
        // 解除这两行的注释以显示队列信息
        this.room.work.draw(1, 3)
        this.room.transport.draw(1, 13)

        this.drawEnergyHarvestInfo()
        if (Game.time % 20) return

        // 如果等级发生变化了就运行 creep 规划
        if (this.stateScanner()) this.onLevelChange(this.level)

        // 调整运营 creep 数量
        if (!(Game.time % 500)) this.adjustCreep()

        // 检查外矿有没有被入侵的，有的话是不是可以重新发布 creep
        if (this.room.memory.remote) {
            for (const remoteRoomName in this.room.memory.remote) {
                // 如果发现入侵者已经老死了，就移除对应属性并重新发布外矿角色组
                if (this.room.memory.remote[remoteRoomName].disableTill <= Game.time) {
                    delete this.room.memory.remote[remoteRoomName].disableTill
                    this.room.spawner.release.remoteCreepGroup(remoteRoomName)
                }
            }
        }
    }

    /**
     * 临时 - 显示能量获取速率
     */
    private drawEnergyHarvestInfo() {
        const { totalEnergy, energyGetRate } = getRoomStats(this.room.name)
        const { x, y } = this.pos
        this.room.visual.text(`可用能量 ${totalEnergy || 0} 获取速率 ${energyGetRate || 0}`, x + 1, y + 0.25, { align: 'left', opacity: 0.5 })
    }

    /**
     * 当等级发生变化时的回调函数
     * 
     * @param level 当前的等级
     */
    public onLevelChange(level: number): void {
        // 刚占领，添加工作单位
        if (level === 1) {
            this.room.spawner.release.harvester()
            this.room.spawner.release.changeBaseUnit('manager', 1)
            this.room.spawner.release.changeBaseUnit('worker', 2)
        }
        else if (level === 8) {
            this.decideUpgradeWhenRCL8()
        }

        // 从二级开始规划布局，因为一级没有可以造的东西
        if (level !== 1) this.log(this.room.planLayout(), 'green')
    }

    /**
     * 根据房间情况调整运营单位的数量
     */
    private adjustCreep(): void {
        this.room.spawner.release.changeBaseUnit('manager', this.room.transport.getExpect())

        // 先更新房间能量使用情况，然后根据情况调整期望
        const energyGetRate = countEnergyChangeRatio(this.room, true)
        const workerChange = this.room.work.getExpect(energyGetRate)

        this.room.spawner.release.changeBaseUnit('worker', workerChange)
    }

    /**
     * 房间升到 8 级后的升级计划
     */
    private decideUpgradeWhenRCL8(): void {
        // 满足以下条件就暂停升级
        if (
            Game.cpu.bucket < 700 ||
            !this.room.storage || this.room.storage.store[RESOURCE_ENERGY] < UPGRADER_WITH_ENERGY_LEVEL_8
        ) {
            // 暂时停止升级计划
            this.room.work.removeTask('upgrade')
            delayQueue.addDelayTask('spawnUpgrader', { roomName: this.room.name }, 10000)
        }
        else {
            // 限制只需要一个单位升级
            this.room.work.updateTask({ type: 'upgrade', need: 1, priority: WORK_TASK_PRIOIRY.UPGRADE })
        }
    }

    /**
     * 统计自己的等级信息
     * 
     * @returns 为 true 时说明自己等级发生了变化
     */
    public stateScanner(): boolean {
        let hasLevelChange = false
        setRoomStats(this.room.name, stats => {
            hasLevelChange = stats.controllerLevel !== this.level
            return {
                // 统计升级进度
                controllerRatio: (this.progress / this.progressTotal) * 100,
                // 统计房间等级
                controllerLevel: this.level
            }
        })

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
        const enemy = this.room._enemys || this.room.find(FIND_HOSTILE_CREEPS, { filter: whiteListFilter })
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

/**
 * 注册升级工的延迟孵化任务
 */
delayQueue.addDelayCallback('spawnUpgrader', room => {
    // 房间或终端没了就不在孵化
    if (!room || !room.storage) return

    // 满足以下条件时就延迟发布
    if (
        // cpu 不够
        Game.cpu.bucket < 700 ||
        // 能量不足
        room.storage.store[RESOURCE_ENERGY] < UPGRADER_WITH_ENERGY_LEVEL_8
    ) return delayQueue.addDelayTask('spawnUpgrader', { roomName: room.name }, 10000)

    room.work.updateTask({ type: 'upgrade', need: 1, priority: WORK_TASK_PRIOIRY.UPGRADE })
})