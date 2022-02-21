import { createRole } from '@/modulesRoom/unitControl'
import { DEFAULT_SIGNER_ROLE } from '../constants'
import { RemoteContext, SignerMemory } from '../types'

/**
 * 生成签名单位的名字
 */
export const getSignerName = (targetRoomName: string) => `${targetRoomName} claimer`

/**
 * 预定者
 * 这个角色并不会想太多，出生了就去预定，一辈子走完了就不再孵化
 * 外矿采集单位采集的时候会检查预定剩余时间，如果不够了会主动发布该角色
 */
export const useSigner = function (context: RemoteContext) {
    const { signerRole = DEFAULT_SIGNER_ROLE, getMemory, goTo, onCreepStageChange, addSpawnCallback, addSpawnTask, env } = context

    const signer = createRole<SignerMemory>({
        getMemory: room => {
            const memory = getMemory(room)
            if (!memory.signer) memory.signer = {}
            return memory.signer
        },
        runTarget: (creep, memory, spawnRoom) => {
            const { targetRoomName, sign } = memory
            if (creep.room.name === targetRoomName) {
                if (creep.signController(creep.room.controller, sign) === ERR_NOT_IN_RANGE) {
                    goTo(creep, creep.room.controller.pos, { checkTarget: false })
                }
            }
            else goTo(creep, new RoomPosition(25, 25, targetRoomName), { checkTarget: false })

            return false
        },
        onCreepStageChange
    })

    addSpawnCallback(signerRole, signer.addUnit)

    /**
     * 发布占领单位
     *
     * @param room 哪个房间孵化
     * @param targetRoomName 要占领的房间
     */
    const releaseSigner = function (room: Room, targetRoomName: string, sign: string) {
        const creepName = getSignerName(targetRoomName)
        addSpawnTask(room, creepName, signerRole, [MOVE])
        signer.registerUnit(creepName, { targetRoomName, sign }, room)
    }

    return { signer, releaseSigner }
}
