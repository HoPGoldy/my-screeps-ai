import { bodyConfigs, createBodyGetter } from '../bodyUtils'
import { CreepConfig, CreepRole } from '../types/role'


const reserver: CreepConfig<CreepRole.Reserver> = {
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

        let result: CreepActionReturnCode
        // 如果房间的预订者不是自己, 就攻击控制器
        if (controller.reservation && controller.reservation.username !== creep.owner.username) {
            result = creep.attackController(controller)
        }
        // 房间没有预定满, 就继续预定
        else if (!controller.reservation || controller.reservation.ticksToEnd < CONTROLLER_RESERVE_MAX) {
            result = creep.reserveController(controller)
        }

        if (result && result === ERR_NOT_IN_RANGE) {
            creep.goTo(controller.pos, { range: 1, checkTarget: false })
        }
        return false
    },
    bodys: createBodyGetter(bodyConfigs.reserver)
}

export default reserver
