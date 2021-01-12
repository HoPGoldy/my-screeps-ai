import { creepApi } from 'modules/creepController'
import { unstringifyBuildPos } from 'modules/autoPlanning'
import { whiteListFilter } from 'utils'
import { setRoomStats } from 'modules/stateCollector'
import { costCache } from 'modules/move'
import { LEVEL_BUILD_RAMPART, UPGRADER_WITH_ENERGY_LEVEL_8 } from 'setting'
import { countEnergyChangeRatio } from 'modules/energyController'
import { addDelayCallback, addDelayTask } from 'modules/delayQueue'

/**
 * Controller 拓展
 */
export default class ControllerExtension extends StructureController {
    public work(): void {
        if (Game.time % 20) return

        // 如果等级发生变化了就运行 creep 规划
        if (this.stateScanner()) this.onLevelChange(this.level)

        // 放置队列中的工地
        this.checkConstructionSites()

        // 调整运营 creep 数量
        this.adjustCreep()

        // 检查外矿有没有被入侵的，有的话是不是可以重新发布 creep
        if (this.room.memory.remote) {
            for (const remoteRoomName in this.room.memory.remote) {
                // 如果发现入侵者已经老死了，就移除对应属性并重新发布外矿角色组
                if (this.room.memory.remote[remoteRoomName].disableTill <= Game.time) {
                    delete this.room.memory.remote[remoteRoomName].disableTill
                    this.room.release.remoteCreepGroup(remoteRoomName)
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
        // 刚占领，添加工作单位
        if (level === 1) {
            this.room.work.planEnergyHarvestTask()
            this.room.release.worker(6)
        }
        else if (level === LEVEL_BUILD_RAMPART[0] || 4) {
            // 开始刷墙后就开始执行刷墙任务
            this.room.work.updateTask({ type: 'repair' })
        }
        else if (level === 8) {
            this.decideUpgradeWhenRCL8()
        }

        // 规划布局
        this.log(this.room.planLayout(), 'green')
    }

    /**
     * 根据房间情况调整运营单位的数量
     */
    private adjustCreep(): void {
        if (Game.time % 500) return

        const { transporterNumber, workerNumber } = this.room.memory
        // 最低一个搬运工
        if (!transporterNumber || transporterNumber <= 0) this.room.memory.transporterNumber = 1
        // 最低每个 source 一个工人
        if (!workerNumber || workerNumber <= 0) this.room.memory.workerNumber = this.room.source.length

        // 根据物流模块返回的期望调整当前搬运工数量
        this.room.memory.transporterNumber += this.room.transport.getExpect()
        this.room.release.manager(this.room.memory.transporterNumber)

        // 根据工作模块返回的期望调整当前工人数量
        this.room.memory.workerNumber += this.room.work.getExpect()
        this.room.release.worker(this.room.memory.workerNumber)
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
            addDelayTask('spawnUpgrader', { roomName: this.room.name }, 10000)
        }
        else {
            // 限制只需要一个单位升级
            this.room.work.updateTask({ type: 'upgrade', need: 1 })
        }
    }

    /**
     * 检查房间中是否存在没有放置的工地
     * 
     * 如果有的话就尝试放置
     */
    public checkConstructionSites(): void {
        // 检查等待放置的工地（CS）队列
        const delayCSList = this.room.memory.delayCSList
        if (!delayCSList) return

        // 仍未完成放置的工地
        const incompleteList: string[] = []

        // 是否需要孵化建造者
        let needBuild = false
        // 遍历整个队列，依次进行处理
        while (delayCSList.length > 0) {
            const constructionSiteStr = delayCSList.shift()
            const info = unstringifyBuildPos(constructionSiteStr, this.room.name)

            const placeResult = info.pos.createConstructionSite(info.type)

            if (placeResult === OK) needBuild = true
            else if (placeResult === ERR_FULL) {
                // 如果工地已经放满了，就不再检查了，直接把剩下的推入到未完成队列
                incompleteList.push(constructionSiteStr, ...delayCSList)
                break
            }
            else if (placeResult !== ERR_RCL_NOT_ENOUGH && placeResult !== ERR_INVALID_TARGET) {
                this.log(`工地 ${info.type} 无法放置，位置 [${info.pos.x}, ${info.pos.y}]，createConstructionSite 结果 ${placeResult}`, 'yellow')
            }
        }

        // 把未完成的任务放回去
        if (incompleteList.length > 0) this.room.memory.delayCSList = incompleteList
        else delete this.room.memory.delayCSList

        if (needBuild && !creepApi.has(`${this.room.name} builder0`)) {
            this.room.work.updateTask({ type: 'build', priority: 9 }, { dispath: true })
            // 有新建筑发布，需要更新房间 cost 缓存
            delete costCache[this.room.name]
        }
    }

    /**
     * 统计自己的等级信息
     * 
     * @returns 为 true 时说明自己等级发生了变化
     */
    private stateScanner(): boolean {
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

        // 统计本房间能量状态
        countEnergyChangeRatio(this.room.name)

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
addDelayCallback('spawnUpgrader', room => {
    // 房间或终端没了就不在孵化
    if (!room || !room.storage) return

    // 满足以下条件时就延迟发布
    if (
        // cpu 不够
        Game.cpu.bucket < 700 ||
        // 能量不足
        room.storage.store[RESOURCE_ENERGY] < UPGRADER_WITH_ENERGY_LEVEL_8
    ) return addDelayTask('spawnUpgrader', { roomName: room.name }, 10000)

    room.work.updateTask({ type: 'upgrade', need: 1 })
})