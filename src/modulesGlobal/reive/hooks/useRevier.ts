import { createRole } from '@/modulesRoom/unitControl/controller'
import { createStaticBody, getUniqueKey } from '@/utils'
import { ReiverMemory } from '..'
import { DEFAULT_REIVER_ROLE } from '../constants'
import { ReiveContext } from '../types'

/**
 * 生成掠夺单位的名字
 */
export const getRevierName = (roomName: string) => `${roomName} happy ${getUniqueKey()}`

/**
 * 生成掠夺单位的身体
 */
export const getRevierBody = createStaticBody(
    [[CARRY, 2], [MOVE, 1]],
    [[CARRY, 3], [MOVE, 2]],
    [[CARRY, 4], [MOVE, 2]],
    [[CARRY, 5], [MOVE, 3]],
    [[CARRY, 8], [MOVE, 4]],
    [[CARRY, 14], [MOVE, 7]],
    [[CARRY, 20], [MOVE, 10]],
    [[CARRY, 32], [MOVE, 16]]
)

/**
 * 防御单位
 * 会自动攻击房间内的敌对单位
 * 注意身体部件不会自动适配，也就是说低等级房间无法造出来这个单位。原因在于低等级房间就算能造出来小 creep 也等于送人头。
 */
export const useRevier = function (context: ReiveContext) {
    const { env, getMemory, reiverRole = DEFAULT_REIVER_ROLE, addSpawnCallback, addSpawnTask, onCreepStageChange, goTo } = context

    /**
     * 找到指定建筑中应该搬运的资源
     */
    const findImportantResource = function (structure: AnyStoreStructure): ResourceConstant {
        if (!structure) return undefined

        const { reiveList = [] } = getMemory()
        if (reiveList.length <= 0) return Object.keys(structure.store)[0] as ResourceConstant

        // 遍历目标建筑存储并找到可以拿取的资源
        for (const res in structure.store) {
            if (structure.store[res] > 0) {
                // 如果有指定要搬运的资源，就看 res 是否是指定的资源之一，是则返回，不是则检查下一个
                if (!reiveList.includes(res as ResourceConstant)) continue
                return res as ResourceConstant
            }
        }
    }

    /**
     * 查找指定房间里应该掠夺的建筑
     */
    const findTargetStructure = function (reiveRoom: Room, memory: ReiverMemory): AnyStoreStructure {
        if (memory.targetStructureId === ERR_NOT_FOUND) return undefined

        const target = env.getObjectById(memory.targetStructureId)
        if (target) return target

        const storageTargetRes = findImportantResource(reiveRoom.storage)
        if (storageTargetRes) {
            memory.targetStructureId = reiveRoom.storage.id
            return reiveRoom.storage
        }

        const terminalTargetRes = findImportantResource(reiveRoom.terminal)
        if (terminalTargetRes) {
            memory.targetStructureId = reiveRoom.terminal.id
            return reiveRoom.terminal
        }

        memory.targetStructureId = ERR_NOT_FOUND
        return undefined
    }

    const reiver = createRole<ReiverMemory>({
        getMemory: room => {
            const memory = getMemory()
            if (!memory.reiver) memory.reiver = {}
            return memory.reiver[room.name]
        },
        onCreepDead: (creepName, memory, spawnRoom) => {
            // 掠夺完了，不再继续孵化
            if (memory.finished) return
            // 没掠夺完，继续孵化
            releaseReiver(spawnRoom, memory.targetRoomName)
        },
        runSource: (creep, memory, storeRoom) => {
            if (creep.store.getFreeCapacity() <= 0) return true

            const { targetRoomName } = memory
            const reiveRoom = env.getRoomByName(targetRoomName)
            if (!reiveRoom) {
                goTo(creep, new RoomPosition(25, 25, targetRoomName))
                return false
            }

            const target = findTargetStructure(reiveRoom, memory)
            if (!target) {
                memory.finished = true
                if (creep.store.getUsedCapacity() > 0) return true
                else {
                    creep.suicide()
                    env.log.success(`${creep.name} 完成掠夺任务，已移除`)
                    return false
                }
            }

            if (!creep.pos.isNearTo(target)) {
                goTo(creep, target.pos)
                return false
            }

            const targetRes = findImportantResource(target)
            // 里边存的目标资源被其他单位拿光了
            if (!targetRes) {
                delete memory.targetStructureId
                return false
            }

            const result = creep.withdraw(target, targetRes)

            // 如果拿满了就执行 target
            if (result === ERR_FULL) return true
            else if (result !== OK) env.log.error(`${creep.name} 掠夺 withdraw 报错 ${result}`)
        },
        /**
         * 运回存储建筑
         */
        runTarget: (creep, memory, storeRoom) => {
            if (creep.store.getUsedCapacity() <= 0) {
                if (memory.finished) {
                    creep.suicide()
                    env.log.success(`${creep.name} 完成掠夺任务，已移除`)
                }
                return true
            }
            const storeStructure: AnyStoreStructure = storeRoom.storage || storeRoom.terminal

            // 把资源放到房间的存储里
            if (storeStructure) {
                const result = creep.transfer(storeStructure, Object.keys(creep.store)[0] as ResourceConstant)
                if (result === ERR_NOT_IN_RANGE) goTo(creep, storeStructure.pos)
                else if (result !== OK) env.log.error(`${creep.name} 掠夺 transfer 报错 ${result}`)
            }
            // 没有存储就扔到地上
            else {
                if (creep.room.name === storeRoom.name) creep.drop(Object.keys(creep.store)[0] as ResourceConstant)
                else goTo(creep, storeRoom.controller.pos)
            }
        },
        onCreepStageChange
    })

    addSpawnCallback(reiverRole, reiver.addUnit)

    /**
     * 发布防御单位
     *
     * @param room 进行孵化的房间
     * @param boostTaskId 使用的强化任务
     */
    const releaseReiver = function (room: Room, targetRoomName: string) {
        const creepName = getRevierName(room.name)
        addSpawnTask(room, creepName, reiverRole, getRevierBody(room.energyAvailable))
        reiver.registerUnit(creepName, { targetRoomName, originRoomName: room.name }, room)
    }

    return { reiver, releaseReiver }
}
