import { createRole } from '@/modulesRoom/unitControl'
import { createStaticBody, getUniqueKey } from '@/utils'
import { DEFAULT_REMOTE_HELPER } from '../constants'
import { EnergySource, RemoteContext, RemoteHelperMemory } from '../types'

/**
 * 生成协助单位的名字
 */
export const getRemoteHelperName = (targetRoomName: string) => `${targetRoomName} helper${getUniqueKey()}`

/**
 * 生成协助单位的身体
 */
export const getRemoteHelperBody = createStaticBody(
    [[WORK, 1], [CARRY, 1], [MOVE, 1]],
    [[WORK, 2], [CARRY, 2], [MOVE, 2]],
    [[WORK, 3], [CARRY, 3], [MOVE, 3]],
    [[WORK, 4], [CARRY, 4], [MOVE, 4]],
    [[WORK, 6], [CARRY, 6], [MOVE, 6]],
    [[WORK, 9], [CARRY, 9], [MOVE, 9]],
    [[WORK, 12], [CARRY, 6], [MOVE, 9]],
    [[WORK, 20], [CARRY, 8], [MOVE, 14]]
)

/**
 * 支援单位
 * 拓展型建造者, 会先抵达指定房间, 然后执行建造者逻辑
 * 如果都造好或者控制器快不行了的话会优先升级控制器
 */
export const useRemoteHelper = function (context: RemoteContext) {
    const {
        remtoeHelperRole = DEFAULT_REMOTE_HELPER, getMemory, goTo, onCreepStageChange,
        addSpawnCallback, addSpawnTask, getSource, getSpawn, getContainer, env
    } = context

    /**
     * 获取指定房间中的可用能量源
     */
    const getRoomSource = function (room: Room) {
        // 优先使用 storage 的能量
        // 不判断 terminal，因为支援单位只在 terminal 造好前才会孵化
        if (room.storage && room.storage.store[RESOURCE_ENERGY] > 5000) return room.storage

        // 没有 storage 就用 container
        const targetContainer = getContainer(room)
            .filter(s => s.store[RESOURCE_ENERGY] > 0)
            .sort((a, b) => b.store[RESOURCE_ENERGY] - a.store[RESOURCE_ENERGY])[0]
        if (targetContainer) return targetContainer

        const sources = getSource(room)

        // 没有 container 就用地上掉的
        const targetDropEnergy = ([] as Resource[])
            .concat(...sources.map(s => s.pos.findInRange(FIND_DROPPED_RESOURCES, 1)))
            .filter(dropRes => dropRes.resourceType === RESOURCE_ENERGY)
            .sort((a, b) => b.amount - a.amount)[0] as Resource<RESOURCE_ENERGY>
        if (targetDropEnergy) return targetDropEnergy

        // 地上没有就找个能量多的采
        return sources.sort((a, b) => b.energy - a.energy)[0]
    }

    const remoteHelper = createRole<RemoteHelperMemory>({
        getMemory: room => {
            const memory = getMemory(room)
            if (!memory.helper) memory.helper = {}
            return memory.helper
        },
        onCreepDead: (creepName, memory, spawnRoom) => {
            const { targetRoomName } = memory
            const targetRoom = env.getRoomByName(targetRoomName)
            // 目标房间没视野就不孵化了
            if (!targetRoom) {
                env.log.error(`${creepName} 在孵化时找不到 ${targetRoomName} 的视野，目标房间可能已经失去控制，停止孵化`)
                return
            }

            // 源房间还不够 7 级并且目标房间的 spawn 已经造好了
            if (spawnRoom.controller?.level < 7 && getSpawn(targetRoom)?.length > 0) {
                env.log.success(`${targetRoomName} 已成功建造初始 spawn，由于${spawnRoom} 的 RCL 不足七级，将停止孵化支援单位 ${creepName}`, true)
                return
            }
            // 源房间大于 7 级，将把新房 terminal 造好之后再停止支援
            else if (spawnRoom.controller?.level >= 7 && targetRoom.terminal) {
                env.log.success(`${targetRoomName} 已成功建造 terminal，将停止孵化支援单位 ${creepName}`, true)
                return
            }

            releaseRemoteHelper(spawnRoom, targetRoomName)
        },
        runSource: (creep, memory) => {
            if (creep.store.getFreeCapacity(RESOURCE_ENERGY) === 0) {
                delete memory.sourceId
                return true
            }

            const { targetRoomName } = memory
            // 先进入房间再说
            if (creep.room.name !== targetRoomName) {
                goTo(creep, new RoomPosition(25, 25, targetRoomName), { checkTarget: false })
                return false
            }

            if (!memory.sourceId) memory.sourceId = getRoomSource(creep.room).id
            const source = env.getObjectById(memory.sourceId)

            creep.getEngryFrom(source)
            return false
        },
        runTarget: (creep, memory, spawnRoom) => {
            if (creep.store[RESOURCE_ENERGY] === 0) return true
            const { targetRoomName, dontBuild } = memory
            const targetRoom = env.getRoomByName(targetRoomName)

            if (dontBuild) creep.upgradeRoom(targetRoomName)
            // 没有就建其他工地
            else if (
                creep.buildRoom(targetRoomName) === ERR_NOT_FOUND ||
                targetRoom.controller.progress <= 3000
            ) memory.dontBuild = true
        },
        onCreepStageChange
    })

    addSpawnCallback(remtoeHelperRole, remoteHelper.addUnit)

    /**
     * 发布协助单位
     *
     * @param room 哪个房间孵化
     * @param targetRoomName 要占领的房间
     * @param sourceId 要采集的 sourceId
     */
    const releaseRemoteHelper = function (room: Room, targetRoomName: string) {
        const creepName = getRemoteHelperName(targetRoomName)
        addSpawnTask(room, creepName, remtoeHelperRole, getRemoteHelperBody(room.energyAvailable))
        remoteHelper.registerUnit(creepName, { targetRoomName }, room)
    }

    return { remoteHelper, releaseRemoteHelper }
}
