import { setRoomStats, getRoomStats } from '@/modulesGlobal/stats'
import { DefenseState } from '@/modulesRoom/tower/types'
import { Color } from '@/utils'

export const runStrategyCore = function (controller: StructureController) {
    // this.drawEnergyHarvestInfo()
    if (Game.time % 20) return

    const { room, level } = controller

    // 如果等级发生变化了就运行 creep 规划
    if (scanRoomState(controller)) onRoomLevelChange(room, level)

    // 二级之后再开始调整，不然有可能会影响固定开局
    if (level >= 2 && !(Game.time % 500)) {
        // 调整运营 creep 数量
        room.strategy.operation.adjustBaseUnit()
        // 并在日常事情执行任务调整（防御时期任务由 tower 接管）
        if (level === 8 && room.towerController.getState() === DefenseState.Daily) {
            room.strategy.operation.adjustTaskWhenRCL8()
        }
    }
}

/**
 * 统计房间等级信息
 * @returns 为 true 时说明 controller 等级发生了变化
 */
export const scanRoomState = function (controller: StructureController) {
    let hasLevelChange = false
    setRoomStats(controller.room.name, stats => {
        hasLevelChange = stats.controllerLevel !== controller.level
        return {
            // 统计升级进度
            controllerRatio: (controller.progress / controller.progressTotal) * 100,
            // 统计房间等级
            controllerLevel: controller.level
        }
    })

    return hasLevelChange
}

export const onRoomLevelChange = function (room: Room, level: number) {
    // 刚占领，添加工作单位
    if (level === 1) room.strategy.operation.initRoomUnit()
    else if (level === 8) {
        room.strategy.operation.setUpgraderWhenRCL8()
        room.strategy.operation.useUnitSetting()
    }

    // 每级都运行一次自动布局规划
    room.log(room.planLayout(), '建筑规划', Color.Green)
}

/**
 * 显示能量获取速率
 */
const drawEnergyHarvestInfo = function (controller: StructureController) {
    const { energyGetRate } = getRoomStats(controller.room.name)
    const { x, y } = controller.pos
    controller.room.visual.text(`能量获取速率 ${energyGetRate || 0}`, x + 1, y + 0.25, { align: 'left', opacity: 0.5 })
}
