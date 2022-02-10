import { withDelayCallback } from '@/mount/global/delayQueue'
import { countEnergyChangeRatio } from '@/modulesGlobal/energyUtils'
import { WORK_TASK_PRIOIRY } from '@/modulesRoom/taskWork'
import { WorkTaskType } from '../taskWork/types'
import { CreepRole } from '@/role/types/role'
import { DelayTaskData } from '@/modulesGlobal/delayQueue'

/**
 * 运维策略
 * 包含房间在和平时期进行的 creep 和任务调度策略
 */

/**
 * 8级时只要 cpu 足够，依旧会孵化一个 upgrader 进行升级
 * 这个限制代表了在房间 8 级时 storage 里的能量大于多少才会持续孵化 upgarder
 */
const UPGRADER_WITH_ENERGY_LEVEL_8 = 700000

/**
 * 判断指定房间是否需要继续升级
 *
 * @param room 要判断的房间
 * @returns 是否需要继续升级
 */
const needContinueUpgrade = function (room: Room): boolean {
    // 快掉级了，必须升
    if (room.controller.ticksToDowngrade <= 12000) return true

    const { total } = room.storageController.getResource(RESOURCE_ENERGY)
    // cpu 不够或者能量不够了就不升级了
    return !(Game.cpu.bucket < 700 || total < UPGRADER_WITH_ENERGY_LEVEL_8)
}

/**
 * 延迟孵化升级工
 */
const delaySpawnUpgrader = withDelayCallback('spawnUpgrader', ({ roomName }: DelayTaskData) => {
    const room = Game.rooms[roomName]
    // 房间或存储没了就不在孵化
    if (!room || !room.storage) return

    // 现在还不是时候，过段时间再试一下
    if (!needContinueUpgrade(room)) {
        return delaySpawnUpgrader({ roomName }, 10000)
    }

    room.work.updateTask({ type: WorkTaskType.Upgrade, need: 1, priority: WORK_TASK_PRIOIRY.UPGRADE })
    room.work.changeUnitNumber(1)
})

/**
 * 初始化房间的运营模块
 * 应在房间刚占领时调用
 */
export const initRoomUnit = function (room: Room) {
    room.harvest.startHarvestSource()
    room.work.changeUnitNumber(1)
    room.transport.changeUnitNumber(2)
}

/**
 * 调整房间的基础运营单位数量
 * 定期执行即可，推荐 500 tick 一次
 */
export const adjustBaseUnit = function (room: Room) {
    room.transport.changeUnitNumber(room.transport.getExpect())

    // 先更新房间能量使用情况，然后根据情况调整期望
    const { energyGetRate, totalEnergy } = countEnergyChangeRatio(room, true)
    const workerChange = room.work.getExpect(totalEnergy, energyGetRate)

    room.work.changeUnitNumber(workerChange)
}

/**
 * 八级之后的任务调整策略
 * 定期执行即可，推荐 500 - 1000 tick 一次
 */
export const adjustTaskWhenRCL8 = function (room: Room) {
    const controller = room.work

    // 控制器掉到一半了再开始刷级，否则就刷墙
    const [upgradePriority, fillWallPriority] = room.controller.ticksToDowngrade < 100000
        ? [WORK_TASK_PRIOIRY.UPGRADE, undefined]
        : [undefined, WORK_TASK_PRIOIRY.UPGRADE]

    controller.updateTask({ type: WorkTaskType.Upgrade, priority: upgradePriority })
    controller.updateTask({ type: WorkTaskType.FillWall, need: 1, priority: fillWallPriority })

    room.work.dispatchTask()
}

/**
 * 设置房间 8 级之后的升级任务
 */
export const setUpgraderWhenRCL8 = function (room: Room) {
    // 需要继续升级控制器
    if (needContinueUpgrade(room)) {
        // 限制只需要一个单位升级
        room.work.updateTask({ type: WorkTaskType.Upgrade, need: 1, priority: WORK_TASK_PRIOIRY.UPGRADE })
    }
    else {
        // 暂时停止升级计划
        room.work.removeTaskByType(WorkTaskType.Upgrade)
        delaySpawnUpgrader({ roomName: room.name }, 10000)
    }
}

/**
 * 将房间的运维角色配置设置为日常模式
 */
export const useUnitSetting = function (room: Room) {
    if (room.controller.level >= 8) {
        // 如果本 shard 的 cpu 较少，8 级之后就限制只要一个 worker
        const max = (
            Game.cpu.shardLimits &&
            Game.cpu.shardLimits[Game.shard.name] <= 20 &&
            room.controller.level >= 8
        )
            ? 1
            : 20
        // 允许没有 worker
        room.work.setUnitLimit({ min: 0, max })
        room.transport.setUnitLimit({ min: 1, max: 2 })
    }
    else {
        // 没到 8 级前不需要特殊限制
        room.work.setUnitLimit()
        room.transport.setUnitLimit()
    }
}

/**
 * 启动 container 造好后进行的运营单位变更
 */
export const changeForStartContainer = function (room: Room) {
    // 每个 container 发布两个 worker
    room.work.changeUnitNumber(4)
    room.work.updateTask({ type: WorkTaskType.Upgrade, priority: WORK_TASK_PRIOIRY.UPGRADE })
}
