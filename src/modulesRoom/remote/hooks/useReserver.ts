import { createRole } from '@/modulesRoom/unitControl'
import { createStaticBody } from '@/utils'
import { RemoteContext, ReserverMemory } from '../types'

/**
 * 生成预定单位的名字
 */
export const getReserverName = (targetRoomName: string) => `${targetRoomName} reserver`

/**
 * 生成预定单位的身体
 */
export const getReserverBody = createStaticBody(
    [[MOVE, 1], [CLAIM, 1]],
    [[MOVE, 1], [CLAIM, 1]],
    [[MOVE, 1], [CLAIM, 1]],
    [[MOVE, 1], [CLAIM, 1]],
    [[MOVE, 2], [CLAIM, 2]],
    [[MOVE, 2], [CLAIM, 2]],
    [[MOVE, 3], [CLAIM, 3]],
    [[MOVE, 5], [CLAIM, 5]]
)

/**
 * 预定者
 * 这个角色并不会想太多，出生了就去预定，一辈子走完了就不再孵化
 * 外矿采集单位采集的时候会检查预定剩余时间，如果不够了会主动发布该角色
 */
export const useReserver = function (context: RemoteContext) {
    const { reserverRole, getMemory, goTo, onCreepStageChange, addSpawnCallback, addSpawnTask, env } = context

    const reserver = createRole<ReserverMemory>({
        getMemory: room => {
            const memory = getMemory(room)
            if (!memory.reserver) memory.reserver = {}
            return memory.reserver
        },
        runTarget: (creep, memory, spawnRoom) => {
            const targetRoom = env.getRoomByName(memory.targetRoomName)
            // 向指定房间移动，这里移动是为了避免 target 阶段里 controller 所在的房间没有视野
            if (!targetRoom) {
                goTo(creep, new RoomPosition(25, 25, memory.targetRoomName), { checkTarget: false })
                return false
            }
            const controller = targetRoom.controller
            if (!controller) {
                env.log.warning(`${creep.name} 在要预定的房间 ${memory.targetRoomName} 中找不到 controller`)
                return false
            }

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
                goTo(creep, controller.pos, { range: 1, checkTarget: false })
            }
            return false
        },
        onCreepStageChange
    })

    addSpawnCallback(reserverRole, reserver.addUnit)

    /**
     * 发布预定单位
     *
     * @param room 要发布到的房间
     * @param targetRoomName 要预定的房间
     */
    const releaseReserver = function (room: Room, targetRoomName: string) {
        const creepName = getReserverName(targetRoomName)
        addSpawnTask(room, creepName, reserverRole, getReserverBody(room.energyAvailable))
        reserver.registerUnit(creepName, { targetRoomName }, room)
    }

    return { reserver, releaseReserver }
}
