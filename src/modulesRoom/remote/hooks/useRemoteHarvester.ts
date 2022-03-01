import { createRole } from '@/modulesRoom/unitControl'
import { createStaticBody } from '@/utils'
import { DEFAULT_REMOTE_HARVESTER_ROLE } from '../constants'
import { RemoteContext, RemoteHarvesterMemory, UnitWorkContext } from '../types'

/**
 * 生成外矿采集工的名字
 */
export const getRemoteHarvesterName = (remoteRoomName: string, sourceId: Id<Source>) => {
    return `${remoteRoomName} RH-${sourceId.slice(sourceId.length - 3)}`
}

/**
 * 生成外矿采集工的身体
 * 外矿采集者拥有更多的 CARRY
 */
export const getRemoteHarvesterBody = createStaticBody(
    [[WORK, 1], [CARRY, 1], [MOVE, 1]],
    [[WORK, 2], [CARRY, 2], [MOVE, 2]],
    [[WORK, 3], [CARRY, 3], [MOVE, 3]],
    [[WORK, 4], [CARRY, 6], [MOVE, 5]],
    [[WORK, 5], [CARRY, 9], [MOVE, 7]],
    [[WORK, 6], [CARRY, 10], [MOVE, 8]],
    [[WORK, 7], [CARRY, 15], [MOVE, 11]],
    [[WORK, 11], [CARRY, 15], [MOVE, 19]]
)

export const useRemoteHarvester = function (context: RemoteContext, getController: UnitWorkContext, releaseReserver: (room: Room, targetRoomName: string) => void) {
    const {
        remoteHarvesterRole = DEFAULT_REMOTE_HARVESTER_ROLE,
        getMemory, goTo, onCreepStageChange, addSpawnCallback, addSpawnTask, env
    } = context

    const remoteHarvester = createRole<RemoteHarvesterMemory>({
        getMemory: room => {
            const memory = getMemory(room)
            if (!memory.harvester) memory.harvester = {}
            return memory.harvester
        },
        onCreepDead: (creepName, memory, spawnRoom) => {
            const { roomName: remoteRoomName, sourceId } = memory
            const { isDisabled } = getController(spawnRoom)
            // 如果外矿目前有入侵者就不生成
            if (isDisabled(remoteRoomName, sourceId)) return
            releaseRemoteHarvester(spawnRoom, remoteRoomName, sourceId)
        },
        // 移动到指定 source 旁，并检查是否有需要建造的工地
        runPrepare: (creep, memory, spawnRoom) => {
            const { roomName, sourceId } = memory
            const source = env.getObjectById(sourceId)

            // 没视野就先往那边走
            if (!source) {
                goTo(creep, new RoomPosition(25, 25, roomName), { checkTarget: false })
                return false
            }
            else goTo(creep, source.pos, { range: 1, checkTarget: false })

            // 都走到房间了还是没找到 source，说明这个外矿填的有问题，拒绝采集
            if (creep.room.name === roomName && !source) {
                getController(spawnRoom).remove(roomName)

                env.log.error(`在 ${roomName} 中未发现 source ${sourceId}，停止该房间外矿采集`)
                creep.suicide()
            }

            if (creep.pos.isNearTo(source)) {
                // 再检查下有没有工地, 没有则这辈子就不检查了
                const constructionSites = source.room.find(FIND_CONSTRUCTION_SITES)
                if (constructionSites.length > 0) memory.dontBuild = true
                return true
            }

            return false
        },
        // 向 source 移动并采集
        runSource: (creep, memory, spawnRoom) => {
            const { roomName, sourceId, callReserver } = memory
            if (creep.store.getFreeCapacity(RESOURCE_ENERGY) <= 0) return true
            const source = env.getObjectById(sourceId)

            // 没视野就先往那边走
            if (!source) {
                goTo(creep, new RoomPosition(25, 25, roomName), { checkTarget: false })
                return false
            }

            // 掉血了就说明被攻击了，直接投降，告诉基地 1500 之后再孵化我
            if (creep.hits < creep.hitsMax) {
                getController(spawnRoom).disableRemote(roomName, sourceId)
            }

            const harvestResult = creep.harvest(source)
            if (harvestResult === OK) {
                // 如果发现 source 上限掉回 1500 了，就发布 reserver
                if (source.energyCapacity === SOURCE_ENERGY_NEUTRAL_CAPACITY && !callReserver) {
                    releaseReserver(spawnRoom, roomName)
                    memory.callReserver = true
                }
            }
            // 一旦被 core 占领就不再生成
            else if (harvestResult === ERR_NOT_OWNER && !(env.getGame().time % 20)) {
                const core = creep.room.find(FIND_STRUCTURES, {
                    filter: s => s.structureType === STRUCTURE_INVADER_CORE
                })

                // 发现入侵者 core
                if (core.length > 0) {
                    const collapseTimerEffect = core[0].effects.find(e => e.effect === EFFECT_COLLAPSE_TIMER)
                    // 将重生时间设置为 core 消失之后
                    // 再加 5000 是因为 core 消失之后控制器还会有 5000 tick 的被预定时间
                    getController(spawnRoom).disableRemote(
                        roomName, sourceId,
                        collapseTimerEffect.ticksRemaining + 5000
                    )
                }
            }
            else if (harvestResult === ERR_NOT_IN_RANGE) {
                creep.goTo(source.pos, { range: 1, checkTarget: false })
            }
            else env.log.error(`${creep.name} 外矿采集异常，harvest 返回值 ${harvestResult}`)
        },
        runTarget: (creep, memory, spawnRoom) => {
            const { roomName, sourceId } = memory
            const { getRemoteEnergyStore, remove } = getController(spawnRoom)
            const target = getRemoteEnergyStore(roomName, sourceId)
            if (!target) {
                remove(roomName)
                env.log.warning(`在 ${spawnRoom.name} 找不到合适的能量存放点，外矿 ${sourceId} 停止采集`)
                creep.suicide()
            }

            // dontBuild 为 false 时表明还在建造阶段
            if (!memory.dontBuild) {
                // 没有可建造的工地后就再也不建造
                const buildResult = creep.buildRoom(roomName)

                if (buildResult === ERR_NOT_FOUND) memory.dontBuild = true
                // 能量不足了就去 source 阶段
                else if (buildResult === ERR_NOT_ENOUGH_ENERGY) {
                    onCreepStageChange(creep, false)
                    return true
                }

                return false
            }

            // 检查脚下的路有没有问题，有的话就进行维修
            const structures = creep.pos.lookFor(LOOK_STRUCTURES)
            if (structures.length > 0) {
                const road = structures[0]
                if (road.hits < road.hitsMax) creep.repair(road)
            }

            // 再把剩余能量运回去
            const result = creep.transfer(target, RESOURCE_ENERGY)
            // 报自己身上资源不足了就说明能量放完了
            if (result === ERR_NOT_ENOUGH_RESOURCES) return true
            else if (result === ERR_FULL) creep.say('满了啊')
            else if (result === ERR_NOT_IN_RANGE) {
                goTo(creep, target.pos, { range: 1 })
                creep.say('在路上啦')
            }
            else if (result !== OK) env.log.error(`target 阶段 transfer 出现异常，错误码 ${result}`)

            return false
        },
        onCreepStageChange
    })

    addSpawnCallback(remoteHarvesterRole, remoteHarvester.addUnit)

    /**
     * 发布搬运工
     *
     * @param room 要发布到的房间
     * @param harvestRoomName 要采集的外矿所在房间
     * @param sourceId 要采集的外矿 id
     */
    const releaseRemoteHarvester = function (room: Room, harvestRoomName: string, sourceId: Id<Source>) {
        const creepName = getRemoteHarvesterName(harvestRoomName, sourceId)
        addSpawnTask(room, creepName, remoteHarvesterRole, getRemoteHarvesterBody(room.energyAvailable))
        remoteHarvester.registerUnit(creepName, { roomName: harvestRoomName, sourceId }, room)
    }

    return { remoteHarvester, releaseRemoteHarvester }
}
