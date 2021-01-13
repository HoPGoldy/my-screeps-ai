import { bodyConfigs } from '../bodyConfigs'
import { createBodyGetter, useCache } from 'utils'
import { HARVEST_MODE } from 'setting'
import { fillSpawnStructure } from 'modules/roomTask/transpoart/actions'
import { updateStructure } from 'modules/shortcut'

/**
 * 采集者
 * 从指定 source 中获取能量 > 将能量存放到身下的 container 中
 */
const harvester: CreepConfig<'harvester'> = {
    prepare: creep => {
        const { harvestRoom, sourceId } = creep.memory.data
        if (creep.room.name !== harvestRoom) {
            creep.goTo(new RoomPosition(25, 25, harvestRoom))
            return false
        }
        const source = Game.getObjectById(sourceId)

        // 设置采集模式
        if (!creep.memory.harvestMode) setHarvestMode(creep, source)

        // 执行各自的准备逻辑
        return actionStrategy[creep.memory.harvestMode].prepare(creep, source)
    },
    source: creep => {
        const { sourceId } = creep.memory.data
        const source = Game.getObjectById(sourceId)

        return actionStrategy[creep.memory.harvestMode].source(creep, source)
    },
    target: creep => {
        return actionStrategy[creep.memory.harvestMode].target(creep)
    },
    bodys: createBodyGetter(bodyConfigs.harvester)
}

/**
 * 搜索指定 source 附近的 container 工地
 * 
 * @param source 要搜索的 source
 */
const findSourceContainerSite = function (source: Source): ConstructionSite<STRUCTURE_CONTAINER> {
    // 还没找到就找 container 的工地
    const constructionSite = source.pos.findInRange(FIND_CONSTRUCTION_SITES, 1, {
        filter: s => s.structureType === STRUCTURE_CONTAINER
    }) as ConstructionSite<STRUCTURE_CONTAINER>[]

    if (constructionSite.length > 0) return constructionSite[0]

    return undefined
}

/**
 * 从工作房间获取当前应有的采集状态
 * 
 * @param room 要获取工作状态的房间
 */
const setHarvestMode = function (creep: Creep, source: Source): HarvestMode {
    // 外矿就采集了运到家
    if (!source.room.controller || source.room.controller.level <= 0) {
        creep.memory.harvestMode = HARVEST_MODE.START
        return
    }

    const nearLink = source.getLink()
    if (nearLink) {
        creep.memory.harvestMode = HARVEST_MODE.TRANSPORT
        creep.memory.targetId = nearLink.id
        return
    }

    creep.memory.harvestMode = HARVEST_MODE.SIMPLE
}

type ActionStrategy = {
    [key in HarvestMode]: {
        prepare: (creep: MyCreep<'harvester'>, source: Source) => boolean,
        source: (creep: MyCreep<'harvester'>, source: Source) => boolean,
        target: (creep: MyCreep<'harvester'>) => boolean,
    }
}

const actionStrategy: ActionStrategy = {
    /**
     * 简单模式下的工作逻辑
     * 往 container 移动 > 维修 container > 无脑采集
     */
    [HARVEST_MODE.SIMPLE]: {
        prepare(creep, source) {
            const target = useCache<StructureContainer | Source | ConstructionSite>(() => {
                // 先尝试获取 container
                const container = source.getContainer()
                if (container) return container
    
                // 再尝试找 container 的工地
                const site = findSourceContainerSite(source)
                if (site) return site
    
                // 如果还是没找到的话就用 source 当作目标
                return source
            }, creep.memory, 'targetId')
    
            // 设置移动范围并进行移动（source 走到附近、container 和工地就走到它上面）
            const range = target instanceof Source ? 1 : 0
            creep.goTo(target.pos, { range })
    
            // 抵达位置了就准备完成
            if (creep.pos.inRangeTo(target.pos, range)) return true
            return false
        },
        /**
         * 因为 prepare 准备完之后会先执行 source 阶段，所以在这个阶段里对 container 进行维护
         * 在这个阶段中，targetId 仅指 container
         */
        source(creep, source) {
            creep.say('🚧')

            // 没有能量就进行采集，因为是维护阶段，所以允许采集一下工作一下
            if (creep.store[RESOURCE_ENERGY] <= 0) {
                creep.getEngryFrom(source)
                return false
            }

            // 获取 prepare 阶段中保存的 targetId
            let target = Game.getObjectById(creep.memory.targetId as Id<StructureContainer | Source>)

            // 存在 container，把血量修满
            if (target && target instanceof StructureContainer) {
                creep.repair(target)
                // 血修满了就正式进入采集阶段
                return target.hits >= target.hitsMax
            }

            // 不存在 container，开始新建，尝试获取工地缓存
            const constructionSite = useCache<ConstructionSite>(() => {
                creep.pos.createConstructionSite(STRUCTURE_CONTAINER)
                return creep.pos.lookFor(LOOK_CONSTRUCTION_SITES).find(s => s.structureType === STRUCTURE_CONTAINER)
            }, creep.memory, 'constructionSiteId')

            // 还没找到就说明有可能工地已经建好了，进行搜索
            if (!constructionSite) {
                const container = creep.pos.lookFor(LOOK_STRUCTURES).find(s => s.structureType === STRUCTURE_CONTAINER) as StructureContainer

                // 找到了造好的 container 了，添加进房间
                if (container) {
                    updateStructure(this.name, STRUCTURE_CONTAINER, container.id)
                    source.setContainer(container)

                    const { useRoom: useRoomName } = creep.memory.data
                    const useRoom = Game.rooms[useRoomName]
                    if (!useRoom) {
                        creep.suicide()
                        return true
                    }

                    /**
                     * 更新家里的搬运工数量，几个 container 就发布其数量 * 3
                     * @todo 这里没有考虑外矿的运输需求，等外矿模块完善后再修改
                     */
                    useRoom.release.manager(useRoom.source.map(source => source.getContainer()).filter(Boolean).length * 3)
                    useRoom.work.updateTask({ type: 'upgrade' })
                    return true
                }

                // 还没找到，等下个 tick 会重新新建工地
                delete creep.memory.constructionSiteId
                return false
            }

            creep.build(constructionSite)
        },
        /**
         * 采集阶段会无脑采集，过量的能量会掉在 container 上然后被接住存起来
         */
        target(creep) {
            const { sourceId } = creep.memory.data
            creep.getEngryFrom(Game.getObjectById(sourceId))

            // 快死了就把身上的能量丢出去，这样就会存到下面的 container 里，否则变成墓碑后能量无法被 container 自动回收
            if (creep.ticksToLive < 2) creep.drop(RESOURCE_ENERGY)
            return false
        }
    },

    /**
     * 转移模式
     * 采集能量 > 存放到指定建筑
     */
    [HARVEST_MODE.TRANSPORT]: {
        prepare: () => true,
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
                    // 并且房间内的 pc 支持这个任务
                    if (creep.room.memory.powers && creep.room.memory.powers.split(' ').includes(String(PWR_REGEN_SOURCE))) {
                        // 添加 power 任务，设置重新尝试时间
                        creep.room.addPowerTask(PWR_REGEN_SOURCE)
                        creep.memory.regenSource = Game.time + 300
                    }
                    else creep.memory.regenSource = Game.time + 1000
                }
            }

            // 快死了就把能量移出去
            if (creep.ticksToLive < 2) return true
        },
        target: (creep) => {
            const target = Game.getObjectById(creep.memory.targetId as Id<StructureLink>) || creep.room.storage

            // 目标没了，弱化为简单模式
            if (!target) {
                delete creep.memory.targetId
                creep.memory.harvestMode = HARVEST_MODE.SIMPLE
                return true
            }

            creep.transferTo(target, RESOURCE_ENERGY)
        }
    },

    /**
     * 启动模式的逻辑非常简单：采集能量，填充 spawn 跟 extension
     * 到两级后就转变为 SIMPLE 模式开始维护 container
     */
    [HARVEST_MODE.START]: {
        prepare: () => true,
        source: (creep, source) => {
            if (creep.store.getFreeCapacity(RESOURCE_ENERGY) === 0) return true
            creep.getEngryFrom(source)

            // 如果控制器升到 2 级了就切换为简单模式
            if (creep.room.controller?.level > 1) creep.memory.harvestMode = HARVEST_MODE.SIMPLE
        },
        target: (creep) => {
            const result = fillSpawnStructure(creep)

            if (result === ERR_NOT_FOUND) {
                creep.say('💤')
                return true
            }
            else if (result === ERR_NOT_ENOUGH_ENERGY) return true
        }
    }
}

export default harvester