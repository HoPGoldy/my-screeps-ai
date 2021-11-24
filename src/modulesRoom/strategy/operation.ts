import { delayQueue } from '@/modulesGlobal/delayQueue'
import { countEnergyChangeRatio } from '@/modulesGlobal/energyUtils'
import { WORK_TASK_PRIOIRY } from '@/modulesRoom/taskWork/constant'
import RoomStrategyController from './controller'
import { DelayTaskType } from '@/modulesGlobal/delayQueue/types'
import { WorkTaskType } from '../taskWork/types'
import { CreepRole } from '@/role/types/role'

/**
 * 8级时只要 cpu 足够，依旧会孵化一个 upgrader 进行升级
 * 这个限制代表了在房间 8 级时 storage 里的能量大于多少才会持续孵化 upgarder
 */
const UPGRADER_WITH_ENERGY_LEVEL_8 = 700000

/**
 * 运维策略
 * 包含房间在和平时期进行的 creep 和任务调度策略
 */
export class OperationStrategy {
    controller: RoomStrategyController

    constructor (strategyController: RoomStrategyController) {
        this.controller = strategyController
    }

    /**
     * 所在房间快捷访问
     */
    get room () {
        return this.controller.room
    }

    /**
     * 初始化房间的运营单位
     * 应在房间刚占领时调用
     */
    initRoomUnit () {
        this.room.spawner.release.harvester()
        this.room.spawner.release.changeBaseUnit(CreepRole.Manager, 1)
        this.room.spawner.release.changeBaseUnit(CreepRole.Worker, 2)
    }

    /**
     * 调整房间的基础运营单位数量
     * 定期执行即可，推荐 500 tick 一次
     */
    adjustBaseUnit () {
        this.room.spawner.release.changeBaseUnit(CreepRole.Manager, this.room.transport.getExpect())

        // 先更新房间能量使用情况，然后根据情况调整期望
        const { energyGetRate, totalEnergy } = countEnergyChangeRatio(this.room, true)
        const workerChange = this.room.work.getExpect(totalEnergy, energyGetRate)

        this.room.spawner.release.changeBaseUnit(CreepRole.Worker, workerChange)
    }

    /**
     * 八级之后的任务调整策略
     * 定期执行即可，推荐 500 - 1000 tick 一次
     */
    adjustTaskWhenRCL8 () {
        const controller = this.room.work

        // 控制器掉到一半了再开始刷级，否则就刷墙
        const [upgradePriority, fillWallPriority] = this.room.controller.ticksToDowngrade < 100000
            ? [WORK_TASK_PRIOIRY.UPGRADE, undefined]
            : [undefined, WORK_TASK_PRIOIRY.UPGRADE]

        controller.updateTask({ type: WorkTaskType.Upgrade, need: 1, priority: upgradePriority })
        controller.updateTask({ type: WorkTaskType.FillWall, priority: fillWallPriority })

        this.room.work.dispatchTask()
    }

    /**
     * 设置房间 8 级之后的升级任务
     */
    setUpgraderWhenRCL8 () {
        // 需要继续升级控制器
        if (needContinueUpgrade(this.room)) {
            // 限制只需要一个单位升级
            this.room.work.updateTask({ type: WorkTaskType.Upgrade, need: 1, priority: WORK_TASK_PRIOIRY.UPGRADE })
        }
        else {
            // 暂时停止升级计划
            this.room.work.removeTaskByType(WorkTaskType.Upgrade)
            delayQueue.addDelayTask(DelayTaskType.SpawnUpgrader, { roomName: this.room.name }, 10000)
        }
    }

    /**
     * 将房间的运维角色配置设置为日常模式
     */
    useUnitSetting () {
        if (this.room.controller.level >= 8) {
            // 如果本 shard 的 cpu 较少，8 级之后就限制只要一个 worker
            const MAX = (
                Game.cpu.shardLimits &&
                Game.cpu.shardLimits[Game.shard.name] <= 20 &&
                this.room.controller.level >= 8
            )
                ? 1
                : 20
            // 允许没有 worker
            this.room.spawner.release.setBaseUnitLimit(CreepRole.Worker, { MIN: 0, MAX })
            this.room.spawner.release.setBaseUnitLimit(CreepRole.Manager, { MIN: 1, MAX: 2 })
        }
        else {
            // 没到 8 级前不需要特殊限制
            this.room.spawner.release.setBaseUnitLimit(CreepRole.Worker)
            this.room.spawner.release.setBaseUnitLimit(CreepRole.Manager)
        }
    }

    /**
     * 启动 container 造好后进行的运营单位变更
     */
    changeForStartContainer () {
        // 每个 container 发布四个 worker
        this.room.spawner.release.changeBaseUnit(CreepRole.Worker, 4)
        this.room.work.updateTask({ type: WorkTaskType.Upgrade, priority: WORK_TASK_PRIOIRY.UPGRADE })
    }
}

/**
 * 判断指定房间是否需要继续升级
 *
 * @param room 要判断的房间
 * @returns 是否需要继续升级
 */
const needContinueUpgrade = function (room: Room): boolean {
    // 快掉级了，必须升
    if (room.controller.ticksToDowngrade <= 12000) return true

    const { total } = room.myStorage.getResource(RESOURCE_ENERGY)
    // cpu 不够或者能量不够了就不升级了
    return !(Game.cpu.bucket < 700 || total < UPGRADER_WITH_ENERGY_LEVEL_8)
}

/**
 * 注册升级工的延迟孵化任务
 */
delayQueue.addDelayCallback(DelayTaskType.SpawnUpgrader, room => {
    // 房间或存储没了就不在孵化
    if (!room || !room.storage) return

    // 满足以下条件时就延迟发布
    if (!needContinueUpgrade(room)) {
        return delayQueue.addDelayTask(DelayTaskType.SpawnUpgrader, { roomName: room.name }, 10000)
    }

    room.work.updateTask({ type: WorkTaskType.Upgrade, need: 1, priority: WORK_TASK_PRIOIRY.UPGRADE })
    room.spawner.release.changeBaseUnit(CreepRole.Worker, 1)
})
