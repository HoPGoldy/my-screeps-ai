import { bodyConfigs } from 'setting'
import { createBodyGetter } from 'utils'

/**
 * 外矿采集者
 * 从指定矿中挖矿 > 将矿转移到建筑中
 */
const remoteHarvester: CreepConfigGenerator<'remoteHarvester'> = data => ({
    // 如果外矿目前有入侵者就不生成
    isNeed: room => {
        // 旗帜效验, 没有旗帜则不生成
        const sourceFlag = Game.flags[data.sourceFlagName]
        if (!sourceFlag) {
            room.log(`找不到名称为 ${data.sourceFlagName} 的旗帜`, 'remoteHarvester')
            return false
        }

        /**
         * 如果有入侵者的话就不再孵化
         * @danger 注意这里并没有 disableTill 和当前进行对比，如果该值释放不及时可能会导致该角色无法正常持续孵化
         */
        if (room.memory.remote && room.memory.remote[sourceFlag.pos.roomName] && room.memory.remote[sourceFlag.pos.roomName].disableTill) return false

        return true
    },
    // 获取旗帜附近的 source
    prepare: creep => {
        if (!creep.memory.sourceId) {
            const sourceFlag = Game.flags[data.sourceFlagName]
            if (!sourceFlag) {
                creep.log(`找不到名称为 ${data.sourceFlagName} 的旗帜`)
                return false
            }

            // 旗帜所在房间没视野, 就进行移动
            if (!sourceFlag.room) creep.goTo(sourceFlag.pos)
            else {
                // 缓存外矿房间名
                sourceFlag.memory.roomName = sourceFlag.room.name
                const sources = sourceFlag.pos.lookFor(LOOK_SOURCES)
                if (sources.length <= 0) {
                    creep.log(`${data.sourceFlagName} 附近没有找到 source`)
                    return false
                }
                // 找到 source 后就写入内存
                creep.memory.sourceId = sources[0].id

                // 再检查下有没有工地, 没有则以后再也不检查
                const constructionSites = sourceFlag.room.find(FIND_CONSTRUCTION_SITES)
                if (constructionSites.length <= 0)
                creep.memory.dontBuild = true
            }
            return false
        }
        else return true
    },
    // 向旗帜出发
    source: creep => {
        if (creep.store.getFreeCapacity(RESOURCE_ENERGY) <= 0) return true

        const sourceFlag = Game.flags[data.sourceFlagName]
        if (!sourceFlag) {
            creep.log(`找不到名称为 ${data.sourceFlagName} 的旗帜`)
            return false
        }

        // 掉血了就说明被攻击了，直接投降，告诉基地 1500 之后再孵化我
        if (creep.hits < creep.hitsMax) {
            const room = Game.rooms[data.spawnRoom]
            if (!room) {
                creep.log(`找不到 ${data.spawnRoom}`)
                return false
            }
            // 如果还没有设置重生时间的话
            if (room.memory.remote[sourceFlag.pos.roomName] && !room.memory.remote[sourceFlag.pos.roomName].disableTill) {
                // 将重生时间设置为 1500 tick 之后
                room.memory.remote[sourceFlag.pos.roomName].disableTill = Game.time + 1500
            }
        }

        const source = Game.getObjectById(creep.memory.sourceId as Id<Source>)
        const harvestResult = creep.harvest(source)
        if (harvestResult === OK) {
            // 如果发现 source 上限掉回 1500 了，就发布 reserver
            if (source.energyCapacity === SOURCE_ENERGY_NEUTRAL_CAPACITY) {
                Game.rooms[data.spawnRoom].addRemoteReserver(creep.room.name)
            }
        }
        // 一旦被 core 占领就不再生成
        else if (harvestResult === ERR_NOT_OWNER && !(Game.time % 20)) {
            const core = creep.room.find(FIND_STRUCTURES, {
                filter: s => s.structureType == STRUCTURE_INVADER_CORE
            })

            // 发现入侵者 core
            if (core.length > 0) {
                const room = Game.rooms[data.spawnRoom]
                if (!room) {
                    creep.log(`找不到 ${data.spawnRoom}`)
                    return false
                }

                // 如果还没有设置重生时间的话
                if (room.memory.remote[sourceFlag.pos.roomName] && !room.memory.remote[sourceFlag.pos.roomName].disableTill) {
                    const collapseTimerEffect = core[0].effects.find(e => e.effect == EFFECT_COLLAPSE_TIMER)

                    if (collapseTimerEffect) {
                        /**
                         * 将重生时间设置为 core 消失之后
                         * 再加 5000 是因为 core 消失之后控制器还会有 5000 tick 的被预定时间 
                         */
                        room.memory.remote[sourceFlag.pos.roomName].disableTill = Game.time + collapseTimerEffect.ticksRemaining + 5000
                    }
                }
            }
        }
        // 这里只要有异常就直接向外矿移动, 因为外矿有可能没视野, 下同
        else {
            creep.goTo(sourceFlag.pos)
        }
    },
    target: creep => {
        // dontBuild 为 false 时表明还在建造阶段
        if (!creep.memory.dontBuild) {
            // 没有可建造的工地后就再也不建造
            const buildResult = creep.buildStructure()

            if (buildResult === ERR_NOT_FOUND)  creep.memory.dontBuild = true
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

        const target = Game.getObjectById(data.targetId)
        if (!target) {
            creep.log(`找不到存放建筑 ${data.targetId}`, 'yellow')
            return false
        }
        
        // 再把剩余能量运回去
        const result = creep.transfer(target, RESOURCE_ENERGY)
        // 报自己身上资源不足了就说明能量放完了
        if (result === ERR_NOT_ENOUGH_RESOURCES) return true
        else if (result === ERR_NOT_IN_RANGE) creep.goTo(target.pos, { range: 1 })
        else if (result === ERR_FULL) creep.say('满了啊')
        else if (result !== OK) creep.log(`target 阶段 transfer 出现异常，错误码 ${result}`, 'red')

        return false
    },
    bodys: createBodyGetter(bodyConfigs.remoteHarvester)
})

export default remoteHarvester