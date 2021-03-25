import { bodyConfigs } from '../bodyConfigs'
import { createBodyGetter } from '@/utils'

/**
 * 预定者
 * 这个角色并不会想太多，出生了就去预定，一辈子走完了就不再出生，外矿采集单位采集的时候会检查预定剩余时间，如果不够了会自己发布该角色
 * 
 * 准备阶段：向指定房间控制器移动
 * 阶段A：预定控制器
 */
const reserver: CreepConfig<'reserver'> = {
    // 该 creep 死了就不会再次孵化
    isNeed: () => false,
    // 向指定房间移动，这里移动是为了避免 target 阶段里 controller 所在的房间没有视野
    prepare: creep => {
        const { targetRoomName } = creep.memory.data

        // 只要进入房间则准备结束
        if (creep.room.name !== targetRoomName) {
            creep.goTo(new RoomPosition(25, 25, targetRoomName), { checkTarget: false })
            return false
        }
        else return true
    },
    // 一直进行预定
    target: creep => {
        const targetRoom = Game.rooms[creep.memory.data.targetRoomName]
        if (!targetRoom) return false
        const controller = targetRoom.controller
        if (!controller) return false

        // 如果房间的预订者不是自己, 就攻击控制器
        if (controller.reservation && controller.reservation.username !== creep.owner.username) {
            if (creep.attackController(controller) == ERR_NOT_IN_RANGE) creep.goTo(controller.pos, { range: 1, checkTarget: false })
        }
        // 房间没有预定满, 就继续预定
        if (!controller.reservation || controller.reservation.ticksToEnd < CONTROLLER_RESERVE_MAX) {
            if (creep.reserveController(controller) == ERR_NOT_IN_RANGE) creep.goTo(controller.pos, { range: 1, checkTarget: false })
        }
        return false
    },
    bodys: createBodyGetter(bodyConfigs.reserver)
}

export default reserver