import { CreepRole } from '@/role/types/role'
import { WorkTaskType } from '../taskWork/types'

/**
 * 将房间的运维角色配置调整为防御模式
 */
export const useDefenseUnitSetting = function (room: Room) {
    // 小于七级的话无法生成 defender，所以会孵化更多的 repairer
    const newWorkerNumber = room.controller.level >= 7 ? 3 : 8

    room.work.setUnitLimit({ min: 1, max: newWorkerNumber })
    room.transport.setUnitLimit({ min: 2, max: 3 })

    // 提高刷墙任务优先级并孵化额外工作单位
    room.work.updateTask({ type: WorkTaskType.FillWall, need: 1, priority: 9 })
    room.work.changeUnitNumber(newWorkerNumber)
}
