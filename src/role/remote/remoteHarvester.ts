import { bodyConfigs, createBodyGetter } from '../bodyUtils'
import { Color } from '@/utils'
import { CreepConfig, CreepRole } from '../types/role'

/**
 * 外矿采集者
 * 从指定矿中挖矿 > 将矿转移到建筑中
 */
const remoteHarvester: CreepConfig<CreepRole.RemoteHarvester> = {
    isNeed: (room, preMemory) => {
        const { roomName: remoteRoomName, sourceId } = preMemory.data
        // 如果外矿目前有入侵者就不生成
        return room.remote.isDisabled(remoteRoomName, sourceId)
    },
    // 移动到指定 source 旁，并检查是否有需要建造的工地
    prepare: creep => {
        const { roomName, sourceId } = creep.memory.data
        const source = Game.getObjectById(sourceId)

        // 没视野就先往那边走
        if (!source) {
            creep.goTo(new RoomPosition(25, 25, roomName), { checkTarget: false })
            return false
        }
        else creep.goTo(source.pos, { range: 1, checkTarget: false })

        // 都走到房间了还是没找到 source，说明这个外矿填的有问题，拒绝采集
        if (creep.room.name === roomName && !source) {
            const spawnRoom = Game.rooms[creep.memory.spawnRoom]
            if (spawnRoom) spawnRoom.remote.remove(roomName, sourceId)
            creep.log(`在 ${roomName} 中未发现 source ${sourceId}，停止该外矿采集`, Color.Red)
            creep.suicide()
        }

        if (creep.pos.isNearTo(source)) {
            // 再检查下有没有工地, 没有则这辈子就不检查了
            const constructionSites = source.room.find(FIND_CONSTRUCTION_SITES)
            if (constructionSites.length > 0) creep.memory.dontBuild = true
            return true
        }

        return false
    },
    // 向 source 移动并采集
    source: creep => {
        const { spawnRoom, data: { roomName, sourceId } } = creep.memory
        if (creep.store.getFreeCapacity(RESOURCE_ENERGY) <= 0) return true
        const source = Game.getObjectById(sourceId)

        // 没视野就先往那边走
        if (!source) {
            creep.goTo(new RoomPosition(25, 25, roomName), { checkTarget: false })
            return false
        }

        // 掉血了就说明被攻击了，直接投降，告诉基地 1500 之后再孵化我
        if (creep.hits < creep.hitsMax) {
            Game.rooms[spawnRoom]?.remote.disableRemote(roomName, sourceId)
        }

        const harvestResult = creep.harvest(source)
        if (harvestResult === OK) {
            // 如果发现 source 上限掉回 1500 了，就发布 reserver
            if (source.energyCapacity === SOURCE_ENERGY_NEUTRAL_CAPACITY) {
                Game.rooms[spawnRoom]?.spawner.release.remoteReserver(creep.room.name)
            }
        }
        // 一旦被 core 占领就不再生成
        else if (harvestResult === ERR_NOT_OWNER && !(Game.time % 20)) {
            const core = creep.room.find(FIND_STRUCTURES, {
                filter: s => s.structureType === STRUCTURE_INVADER_CORE
            })

            // 发现入侵者 core
            if (core.length > 0) {
                const collapseTimerEffect = core[0].effects.find(e => e.effect === EFFECT_COLLAPSE_TIMER)
                // 将重生时间设置为 core 消失之后
                // 再加 5000 是因为 core 消失之后控制器还会有 5000 tick 的被预定时间
                Game.rooms[spawnRoom]?.remote.disableRemote(
                    roomName, sourceId,
                    collapseTimerEffect.ticksRemaining + 5000
                )
            }
        }
        else if (harvestResult === ERR_NOT_IN_RANGE) {
            creep.goTo(source.pos, { range: 1, checkTarget: false })
        }
        else creep.log(`外矿采集异常，harvest 返回值 ${harvestResult}`)
    },
    target: creep => {
        const { spawnRoom: spawnRoomName, data: { sourceId, roomName } } = creep.memory
        const spawnRoom = Game.rooms[spawnRoomName]
        const target = spawnRoom?.remote.getRemoteEnergyStore(roomName, sourceId)
        if (!target) {
            spawnRoom?.remote.remove(roomName, sourceId)
            creep.log(`在 ${spawnRoomName} 找不到合适的能量存放点，外矿 ${sourceId} 停止采集`, Color.Red)
            creep.suicide()
        }

        // dontBuild 为 false 时表明还在建造阶段
        if (!creep.memory.dontBuild) {
            // 没有可建造的工地后就再也不建造
            const buildResult = creep.buildStructure()

            if (buildResult === ERR_NOT_FOUND) creep.memory.dontBuild = true
            // 能量不足了就去 source 阶段，同时释放掉禁止通行点位
            else if (buildResult === ERR_NOT_ENOUGH_ENERGY) {
                delete creep.memory.stand
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
        const result = creep.transferTo(target, RESOURCE_ENERGY, { range: 1 })
        // 报自己身上资源不足了就说明能量放完了
        if (result === ERR_NOT_ENOUGH_RESOURCES) return true
        else if (result === ERR_FULL) creep.say('满了啊')
        else if (result === ERR_NOT_IN_RANGE) creep.say('在路上啦')
        else if (result !== OK) creep.log(`target 阶段 transfer 出现异常，错误码 ${result}`, Color.Red)

        return false
    },
    bodys: createBodyGetter(bodyConfigs.remoteHarvester)
}

export default remoteHarvester
