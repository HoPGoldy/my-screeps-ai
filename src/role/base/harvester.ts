import { bodyConfigs } from '../bodyConfigs'
import { createBodyGetter } from 'utils'

/**
 * 采集者
 * 从指定 source 中获取能量 > 将能量存放到身下的 container 中
 */
const harvester: CreepConfigGenerator<'harvester'> = data => ({
    /**
     * 向 container 或者 source 移动
     * 在这个阶段中，targetId 是指 container 或 conatiner 的工地或 source
     */
    prepare: creep => {
        let target: StructureContainer | Source | ConstructionSite
        // 如果有缓存的话就获取缓存
        if (creep.memory.targetId) target = Game.getObjectById(creep.memory.targetId as Id<StructureContainer | Source>)
        const source = Game.getObjectById(data.sourceId)

        // 没有缓存或者缓存失效了就重新获取
        if (!target) {
            // 先尝试获取 container
            const containers = source.pos.findInRange<StructureContainer>(FIND_STRUCTURES, 1, {
                filter: s => s.structureType === STRUCTURE_CONTAINER
            })

            // 找到了就把 container 当做目标
            if (containers.length > 0) target = containers.find(container => {
                const stoodCreep = container.pos.lookFor(LOOK_CREEPS)
                // 如果两个 source 离得比较近的话，harvesterA 可能会获取到 harvesterB 的 container，然后就一直往上撞，这里筛选一下
                return !(stoodCreep.length > 0 && stoodCreep[0].memory && stoodCreep[0].memory.role === 'harvester')
            })
        }

        // 还没找到就找 container 的工地
        if (!target) {
            const constructionSite = source.pos.findInRange(FIND_CONSTRUCTION_SITES, 1, {
                filter: s => s.structureType === STRUCTURE_CONTAINER
            })

            if (constructionSite.length > 0) target = constructionSite[0]
        }

        // 如果还是没找到的话就用 source 当作目标
        if (!target) target = source
        creep.memory.targetId = target.id

        // 设置移动范围并进行移动（source 走到附近、container 和工地就走到它上面）
        const range = target instanceof Source ? 1 : 0
        creep.goTo(target.pos, { range })

        // 抵达位置了就准备完成
        if (creep.pos.inRangeTo(target.pos, range)) return true
        return false
    },
    // 因为 prepare 准备完之后会先执行 source 阶段，所以在这个阶段里对 container 进行维护
    // 在这个阶段中，targetId 仅指 container
    source: creep => {
        creep.say('🚧')

        // 没有能量就进行采集，因为是维护阶段，所以允许采集一下工作一下
        if (creep.store[RESOURCE_ENERGY] <= 0) {
            creep.getEngryFrom(Game.getObjectById(data.sourceId))
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

        // 不存在 container，开始新建，首先尝试获取工地缓存，没有缓存就新建工地
        let constructionSite: ConstructionSite
        if (!creep.memory.constructionSiteId) creep.pos.createConstructionSite(STRUCTURE_CONTAINER)
        else constructionSite = Game.getObjectById(creep.memory.constructionSiteId)

        // 没找到工地缓存或者工地没了，重新搜索
        if (!constructionSite) constructionSite = creep.pos.lookFor(LOOK_CONSTRUCTION_SITES).find(s => s.structureType === STRUCTURE_CONTAINER)

        // 还没找到就说明有可能工地已经建好了，进行搜索
        if (!constructionSite) {
            const container = creep.pos.lookFor(LOOK_STRUCTURES).find(s => s.structureType === STRUCTURE_CONTAINER)

            // 找到了造好的 container 了，添加进房间
            if (container) {
                creep.room.registerContainer(container as StructureContainer)
                return true
            }

            // 还没找到，等下个 tick 会重新新建工地
            return false
        }
        // 找到了就缓存 id
        else creep.memory.constructionSiteId = constructionSite.id

        creep.build(constructionSite)
    },
    // 采集阶段会无脑采集，过量的能量会掉在 container 上然后被接住存起来
    target: creep => {
        creep.getEngryFrom(Game.getObjectById(data.sourceId))

        // 快死了就把身上的能量丢出去，这样就会存到下面的 container 里，否则变成墓碑后能量无法被 container 自动回收
        if (creep.ticksToLive < 2) creep.drop(RESOURCE_ENERGY)
        return false
    },
    bodys: createBodyGetter(bodyConfigs.harvester)
})

export default harvester