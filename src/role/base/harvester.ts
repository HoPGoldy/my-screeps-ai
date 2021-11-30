import { bodyConfigs, createBodyGetter } from '../bodyUtils'
import { addConstructionSite } from '@/mount/global/construction'
import { WORK_TASK_PRIOIRY } from '@/modulesRoom/taskWork/constant'
import { WorkTaskType } from '@/modulesRoom/taskWork/types'
import { CreepConfig, CreepRole, RoleCreep } from '../types/role'
import { getFreeSpace, serializePos, unserializePos, Color, getUniqueKey } from '@/utils'

/**
 * 能量采集单位的行为模式
 */
export enum HarvestMode {
    /**
     * 启动模式
     * 会采集能量然后运送会 spawn 和 extension
     */
    Start = 1,
    /**
     * 简单模式
     * 会无脑采集能量，配合 container 使用
     */
    Simple,
    /**
     * 转移模式
     * 会采集能量然后存放到指定建筑，配合 link 使用
     */
    Transport
}

/**
 * 移动到 source 旁丢弃能量的位置
 * @param creep 执行移动的单位
 */
const goToDropPos = function (creep: RoleCreep<CreepRole.Harvester>, source: Source): {
    // 本次移动的返回值
    result: ScreepsReturnCode
    // 移动的目的地（之前没有丢弃位置的话目标就为 source，否则为对应的能量丢弃位置）
    targetPos: RoomPosition
    // 要移动到的范围
    range: number
} {
    let targetPos: RoomPosition
    let range = 0

    // 尝试从缓存里读位置
    const { standPos } = creep.memory.data
    if (standPos) targetPos = unserializePos(standPos)
    else {
        const { pos: droppedPos } = source.getDroppedInfo()
        // 之前就已经有点位了，自己保存一份
        if (droppedPos) creep.memory.data.standPos = serializePos(droppedPos)
        // 没有点位的话就要移动到 source，调整移动范围
        else range = 1

        targetPos = droppedPos || source.pos
    }

    // 到了就不进行移动了
    if (creep.pos.isEqualTo(targetPos)) return { result: OK, targetPos, range }

    // 执行移动
    const result = creep.goTo(targetPos, { range, checkTarget: false })
    return { result, targetPos, range }
}

/**
 * 从工作房间获取当前应有的采集状态
 *
 * @param room 要获取工作状态的房间
 */
const setHarvestMode = function (creep: RoleCreep<CreepRole.Harvester>, source: Source): void {
    // // 有玩家手动指定的能量存放建筑，直接使用
    const { targetId: staticId } = creep.memory.data
    if (staticId) {
        if (Game.getObjectById(staticId)) {
            creep.memory.harvestMode = HarvestMode.Transport
            creep.memory.targetId = staticId
            return
        }
        else {
            creep.log(`未找到配置的能量存放位置 ${staticId}，已移除该配置`, Color.Red)
            delete creep.memory.data.targetId
        }
    }

    // 有 link 就往里运
    const nearLink = source.getLink()
    if (nearLink) {
        creep.memory.harvestMode = HarvestMode.Transport
        creep.memory.targetId = nearLink.id
        return
    }

    // 有 container 就往上走
    const nearContainer = source.getContainer()
    if (nearContainer) {
        creep.memory.harvestMode = HarvestMode.Simple
        creep.memory.targetId = nearContainer.id
        return
    }

    // 啥都没有就启动模式
    creep.memory.harvestMode = HarvestMode.Start
}

type ActionStrategy = {
    [key in HarvestMode]: {
        prepare: (creep: RoleCreep<CreepRole.Harvester>, source: Source) => boolean,
        source: (creep: RoleCreep<CreepRole.Harvester>, source: Source) => boolean,
        target: (creep: RoleCreep<CreepRole.Harvester>) => boolean,
    }
}

/**
 * 采集单位不同模式下的行为
 */
const actionStrategy: ActionStrategy = {
    /**
     * 启动模式
     *
     * 当房间内没有搬运工时，采集能量，填充 spawn 跟 extension
     * 当有搬运工时，无脑采集能量
     */
    [HarvestMode.Start]: {
        prepare: (creep, source) => {
            const { targetPos, range } = goToDropPos(creep, source)

            // 没有抵达位置就准备未完成
            if (!creep.pos.inRangeTo(targetPos, range)) return false

            // 启动模式下，走到之后就将其设置为能量丢弃点
            source.setDroppedPos(creep.pos)

            // 把该位置存缓存到自己内存
            creep.memory.data.standPos = serializePos(creep.pos)

            // 如果脚下没有 container 及工地的话就放工地并发布建造任务
            const getContainerFilter = s => s.structureType === STRUCTURE_CONTAINER
            const posContinaer = creep.pos.lookFor(LOOK_STRUCTURES).filter(getContainerFilter)
            const posContinaerSite = creep.pos.lookFor(LOOK_CONSTRUCTION_SITES).filter(getContainerFilter)

            if (posContinaer.length <= 0 && posContinaerSite.length <= 0) {
                const { x, y, roomName } = creep.pos
                addConstructionSite([{ x, y, roomName, type: STRUCTURE_CONTAINER }])
                // container 建造任务的优先级应该是最高的
                creep.room.work.addTask({ type: WorkTaskType.BuildStartContainer, sourceId: source.id, priority: 4 })
                // creep.log(`发布 source ${source.id} 的 container 建造任务`, Color.Green)
            }

            return true
        },
        // 挖能量
        source: (creep, source) => {
            const useRoom = Game.rooms[creep.memory.data.useRoom]
            if (!useRoom) return false

            // 如果有搬运工了就无脑采集
            if (
                useRoom.transport.getUnit().length <= 0 &&
                creep.store.getFreeCapacity(RESOURCE_ENERGY) === 0
            ) return true

            creep.harvest(source)
            goToDropPos(creep, source)
        },
        // 把能量运到 spawn
        target: (creep) => {
            const useRoom = Game.rooms[creep.memory.data.useRoom]
            if (!useRoom) return false

            // 有运输工了就回去挖能量
            if (creep.store[RESOURCE_ENERGY] <= 0 || useRoom.transport.getUnit().length > 0) return true

            // 找到 spawn 然后把身上的能量全塞进去，不搜索 extension，因为启动时还没有 extension
            // 就算是重建，只要保证 spawn 里有能量也能孵化搬运工了
            const targetSpawn = useRoom[STRUCTURE_SPAWN].find(spawn => {
                return spawn.store[RESOURCE_ENERGY] < SPAWN_ENERGY_CAPACITY
            }) || useRoom[STRUCTURE_SPAWN][0]

            if (!targetSpawn) {
                creep.say('😨卧槽我家没了')
                return false
            }

            creep.transferTo(targetSpawn, RESOURCE_ENERGY)
        }
    },

    /**
     * 简单模式
     *
     * 在 container 不存在时切换为启动模式
     * 往 container 移动 > 检查 container 状态 > 无脑采集
     */
    [HarvestMode.Simple]: {
        prepare: (creep, source) => {
            const container = source.getContainer()
            if (!container) {
                creep.memory.harvestMode = HarvestMode.Start
                return false
            }

            creep.goTo(container.pos, { range: 0, checkTarget: false })
            // 没抵达位置了就还没准备完成
            if (!creep.pos.inRangeTo(container, 0)) return false

            // container 掉血了就发布维修任务
            if (container.hits < container.hitsMax) {
                const useRoom = Game.rooms[creep.memory.data.useRoom]
                if (!useRoom) return false
                // 修个小 container，派一个人来修就可以了
                useRoom.work.updateTask({ type: WorkTaskType.Repair, need: 1, priority: WORK_TASK_PRIOIRY.REPAIR }, { dispath: true })
            }

            return true
        },
        /**
         * 采集阶段会无脑采集，过量的能量会掉在 container 上然后被接住存起来
         */
        source: (creep) => {
            const { sourceId } = creep.memory.data
            const source = Game.getObjectById(sourceId)
            creep.getEngryFrom(source)

            // 如果房间里有 storage，则定期发布 container 到 storage 的能量转移任务
            if (creep.room.storage && !(Game.time % 20)) {
                const container = source.getContainer()

                // 容器没了，有可能是起了 Link 或者被敌人拆了，总之重新设置目标
                if (!container) {
                    setHarvestMode(creep, source)
                    return false
                }

                // 能量达到数量了就发布任务，这个值应该低一点
                // 不然有可能出现 worker 吃能量比较快导致任务发布数量太少
                if (container.store[RESOURCE_ENERGY] > 200) {
                    creep.memory.energyTransferId = creep.room.transport.updateTask({
                        key: creep.memory.energyTransferId,
                        // 这里用 creep  名字是为了避免多个 container 的转移任务覆盖彼此
                        type: creep.name,
                        requests: [{
                            from: container.id,
                            to: creep.room.storage.id,
                            resType: RESOURCE_ENERGY,
                            amount: Math.max(container.store[RESOURCE_ENERGY] / 2, 250)
                        }]
                    }, { dispath: true })
                    // creep.log(`更新能量转移任务 ${Math.max(container.store[RESOURCE_ENERGY] / 2, 250)} 任务 id ${creep.memory.energyTransferId}`)
                }
            }

            // 快死了就把身上的能量丢出去，这样就会存到下面的 container 里，否则变成墓碑后能量无法被 container 自动回收
            if (creep.ticksToLive < 2) creep.drop(RESOURCE_ENERGY)
            return false
        },
        /**
         * 简单模式没有 target 阶段
         */
        target: () => true
    },

    /**
     * 转移模式
     *
     * 在 link 不存在时切换为启动模式
     * 采集能量 > 存放到指定建筑（在 memory.data.targetId 未指定是为 link）
     */
    [HarvestMode.Transport]: {
        prepare: (creep, source) => {
            const targetStructure = Game.getObjectById(creep.memory.targetId)

            // 目标没了，变更为启动模式
            if (!targetStructure) {
                delete creep.memory.targetId
                creep.memory.harvestMode = HarvestMode.Start
                return false
            }

            let targetPos: RoomPosition
            if (creep.memory.data.standPos) {
                targetPos = unserializePos(creep.memory.data.standPos)
            }
            else {
                // 移动到 link 和 source 相交的位置，这样不用移动就可以传递能量
                targetPos = getFreeSpace(source.pos).find(pos => pos.isNearTo(targetStructure.pos))
                // 缓存起来供以后使用
                if (targetPos) creep.memory.data.standPos = serializePos(targetPos)
            }

            creep.goTo(targetPos || source.pos, { range: 0 })

            // 如果没有找到又挨着 source 又挨着目标建筑的位置，走到 source 附近就算完成，找到了的话要走到位置上才算完成
            return targetPos ? creep.pos.isEqualTo(targetPos) : creep.pos.isNearTo(source.pos)
        },
        source: (creep, source) => {
            if (creep.store.getFreeCapacity(RESOURCE_ENERGY) === 0) return true

            const result = creep.getEngryFrom(source)

            if (result === ERR_NOT_ENOUGH_RESOURCES) {
                // 如果满足下列条件就重新发送 regen_source 任务
                if (
                    // creep 允许重新发布任务
                    (!creep.memory.regenSource || creep.memory.regenSource < Game.time) &&
                    // source 上没有效果
                    (!source.effects || !source.effects[PWR_REGEN_SOURCE])
                ) {
                    // 添加 power 任务
                    const result = creep.room.power.addTask(PWR_REGEN_SOURCE)
                    // 添加失败了的话就把重试间隔设长一点
                    const regenSourceInterval = result === OK ? 300 : 1000
                    creep.memory.regenSource = Game.time + regenSourceInterval
                }
            }

            // 快死了就把能量移出去
            if (creep.ticksToLive < 2) return true
        },
        target: (creep) => {
            const target = Game.getObjectById(creep.memory.targetId as Id<StructureLink>) || creep.room.storage

            // 目标没了，变更为启动模式
            if (!target) {
                delete creep.memory.targetId
                creep.memory.harvestMode = HarvestMode.Start
                return true
            }

            creep.transferTo(target, RESOURCE_ENERGY)
            return true
        }
    }
}

/**
 * 采集者
 * 从指定 source 中获取能量 > 将能量存放到身下的 container 中
 */
const harvester: CreepConfig<CreepRole.Harvester> = {
    prepare: creep => {
        const { harvestRoom: harvestRoomName, sourceId } = creep.memory.data
        const harvestRoom = Game.rooms[harvestRoomName]

        if (!harvestRoom) {
            creep.goTo(new RoomPosition(25, 25, harvestRoomName), { checkTarget: false })
            return false
        }
        const source = Game.getObjectById(sourceId)

        // 设置采集模式
        if (!creep.memory.harvestMode) setHarvestMode(creep, source)

        // 执行各自的准备逻辑
        return actionStrategy[creep.memory.harvestMode].prepare(creep, source)
    },

    source: creep => {
        const source = Game.getObjectById(creep.memory.data.sourceId)
        return actionStrategy[creep.memory.harvestMode].source(creep, source)
    },

    target: creep => {
        return actionStrategy[creep.memory.harvestMode].target(creep)
    },

    bodys: (room, spawn, data) => {
        const source = Game.getObjectById(data.sourceId)

        // 如果没视野或者边上没有 Link 的话，就用 harvester 标准的部件
        const bodyConfig = !source || !source.getLink()
            ? bodyConfigs.harvester
            : bodyConfigs.worker

        return createBodyGetter(bodyConfig)(room, spawn)
    }
}

export default harvester
