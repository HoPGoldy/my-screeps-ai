import { MAX_UPGRADER_NUM, MAX_HARVESTER_NUM, UPGRADE_WITH_TERMINAL, UPGRADE_WITH_STORAGE } from 'setting'
import { creepApi } from '../creepController'

// 在 Function 原型上挂载 setNextPlan 方法来完成 creep 发布的职责链
declare global { interface Function { setNextPlan(nextPlan: PlanNodeFunction): PlanNodeFunction }}

/**
 * AOP 创建切面
 * 在发布计划返回 false 时执行下一个计划
 * 
 * @param nextPlan 该发布计划不适用时要执行的下一个计划
 */
Function.prototype.setNextPlan = function(nextPlan): PlanNodeFunction {
    return (args) => {
        const canExec = this(args)
        if (!canExec) return nextPlan(args)

        return canExec
    }
}

/**
 * 快捷发布 upgrader
 * @param roomName 要添加到的房间名
 * @param indexs creep 的名称后缀
 * @param sourceId 能量来源 id
 */
const addUpgrader = function(roomName: string, indexs: number[], sourceId: string): void {
    indexs.forEach(i => creepApi.add(`${roomName} upgrader${i}`, 'upgrader', { sourceId }, roomName))
}

const releasePlans: CreepReleasePlans = {
    /**
     * 发布能量采集单位的相关逻辑
     */
    harvester: {
        // 状态收集
        getStats(room: Room): HarvesterPlanStats {
            const stats: HarvesterPlanStats = {
                room,
                // 查找 source 及其身边的 link
                sources: room.sources.map(s => {
                    const nearLinks = s.pos.findInRange<StructureLink>(FIND_MY_STRUCTURES, 2, {
                        filter: s => s.structureType === STRUCTURE_LINK
                    })
                    return {
                        id: s.id,
                        linkId: nearLinks.length > 0 ? nearLinks[0].id : undefined
                    }
                })
            }
        
            // 收集 centerLink 及 storage
            if (room.centerLink) stats.centerLinkId = room.centerLink.id
            if (room.storage) stats.storageId = room.storage.id
        
            return stats
        },
        // 发布计划
        plans: [
            // 有 storage 也有 centerLink，可以通过 sourceLink 转移能量了
            ({ room, storageId, centerLinkId, sources }: HarvesterPlanStats) => {
                if (!(storageId && centerLinkId)) return false

                // 遍历所有 source 进行发布
                sources.forEach((sourceDetail, index) => {
                    // 有对应的 sourceLink 的话 harvester 把自己的能量放进去
                    if (sourceDetail.linkId) creepApi.add(`${room.name} harvester${index}`, 'collector', {
                        sourceId: sourceDetail.id,
                        targetId: sourceDetail.linkId
                    }, room.name)
                    // 没有的话就还是老角色，只是装满的时候会把能量存到 storage 里
                    else creepApi.add(`${room.name} harvester${index}`, 'harvester', {
                        sourceId: sourceDetail.id
                    }, room.name)
                })

                room.log(`能量将存放至 sourceLink`, 'harvester', 'green')
                return true
            },

            // 没有 storage，直接发布 harvester
            ({ room, sources }: HarvesterPlanStats) => {
                // 遍历所有 source 进行发布，多余能量直接存到 storage 里
                sources.forEach((sourceDetail, index) => {
                    creepApi.add(`${room.name} harvester${index}`, 'harvester', {
                        sourceId: sourceDetail.id
                    }, room.name)
                })

                room.log(`能量将存放至 sourceContainer`, 'harvester', 'green')
                return true
            },
        ]
    },

    /**
     * 发布升级单位的相关逻辑
     */
    upgrader: {
        // 状态收集
        getStats(room: Room): UpgraderPlanStats {
            const stats: UpgraderPlanStats = {
                room,
                controllerLevel: room.controller.level,
                ticksToDowngrade: room.controller.ticksToDowngrade,
                sourceContainerIds: room.sourceContainers.map(container => container.id) || [],
                upgradeLinkId: room.memory.upgradeLinkId
            }
        
            if (room.storage) {
                stats.storageId = room.storage.id
                stats.storageEnergy = room.storage.store[RESOURCE_ENERGY]
            }
        
            if (room.terminal) {
                stats.terminalId = room.terminal.id
                stats.terminalEnergy = room.terminal.store[RESOURCE_ENERGY]
            }
        
            return stats
        },
        // 发布计划
        plans: [
            // 8 级时的特殊判断
            ({ room, controllerLevel, ticksToDowngrade, upgradeLinkId }: UpgraderPlanStats) => {
                if (controllerLevel < 8) return false
                // 掉级还早，不发布 upgrader 了
                if (ticksToDowngrade >= 100000) return true
        
                // 快掉级了就发布一个
                addUpgrader(room.name, [ 0 ], upgradeLinkId)

                return true
            },
        
            // 优先用 upgradeLink
            ({ room, upgradeLinkId }: UpgraderPlanStats) => {
                if (!upgradeLinkId) return false
        
                // 发布升级单位给 link
                addUpgrader(room.name, [0, 1], upgradeLinkId)

                room.log('将从 upgradeLink 获取能量', 'upgrader', 'green')
                return true
            },
        
            // 用终端能量发布 upgrader
            ({ room, terminalId, terminalEnergy }: UpgraderPlanStats) => {
                if (!terminalId || terminalEnergy < UPGRADE_WITH_TERMINAL[UPGRADE_WITH_TERMINAL.length - 1].energy ) return false
        
                // 遍历配置项进行 upgrader 发布
                UPGRADE_WITH_TERMINAL.find(config => {
                    // 找到对应的配置项了，发布对应数量的 upgrader
                    if (terminalEnergy > config.energy) {
                        addUpgrader(room.name, new Array(config.num).fill(undefined).map((_, i) => i), terminalId)
                        room.log(`将从 terminal 获取能量，发布数量 * ${config.num}`, 'upgrader', 'green')
                        return true
                    }
                })

                return true
            },

            // 根据 storage 里的能量发布对应数量的 upgrader
            ({ room, storageId, storageEnergy }: UpgraderPlanStats) => {
                if (!storageId || storageEnergy < UPGRADE_WITH_STORAGE[UPGRADE_WITH_STORAGE.length - 1].energy ) return false

                // 遍历配置项进行 upgrader 发布
                UPGRADE_WITH_STORAGE.find(config => {
                    // 找到对应的配置项了，发布对应数量的 upgrader
                    if (storageEnergy > config.energy) {
                        addUpgrader(room.name, new Array(config.num).fill(undefined).map((_, i) => i), storageId)
                        room.log(`将从 storage 获取能量，发布数量 * ${config.num}`, 'upgrader', 'green')
                        return true
                    }
                })

                return true
            },

            // 兜底，从 sourceContainer 中获取能量
            ({ room, sourceContainerIds }: UpgraderPlanStats) => {
                // 因为有 repairer 刷墙，所以每个 container 发布两个单位
                // 在有援建单位时每个 container 只发布一个升级单位
                const upgraderIndexs = creepApi.has(`${room.name} RemoteUpgrader`) || creepApi.has(`${room.name} RemoteBuilder`) ? [ 0 ] : [ 0, 1 ]

                // 遍历所有 container，发布对应数量的 upgrader
                sourceContainerIds.forEach((containerId, index) => {
                    addUpgrader(room.name, upgraderIndexs.map(i => index + (i * 2)), containerId)
                })

                room.log(`将从 sourceContainer 获取能量，发布数量 * ${sourceContainerIds.length * upgraderIndexs.length}`, 'upgrader', 'green')
                return true
            }
        ]
    },

    /**
     * 发布资源运输单位的相关逻辑
     */
    transporter: {
        // 状态收集
        getStats(room: Room): TransporterPlanStats {
            const stats: TransporterPlanStats = {
                room,
                sourceContainerIds: room.sourceContainers.map(container => container.id) || []
            }

            if (room.storage) stats.storageId = room.storage.id
            if (room.centerLink) stats.centerLinkId = room.centerLink.id
            if (room.memory.center) stats.centerPos = room.memory.center

            return stats
        },
        // 发布计划
        plans: [
            // container 修建完成
            ({ room, sourceContainerIds }: TransporterPlanStats) => {
                // 遍历现存的 container，发布填充单位
                sourceContainerIds.forEach((containerId, index) => creepApi.add(`${room.name} filler${index}`, 'filler', {
                    sourceId: containerId
                }, room.name))

                room.log(`发布 filler * ${sourceContainerIds.length}`, 'transporter', 'green')
                // 发布并没有完成，继续检查是否可以发布 manager 和 processor
                return false
            },

            // storage 修建完成
            ({ room, storageId }: TransporterPlanStats) => {
                // 如果没有 storage 的话，那么 manager 和 processor 就都没有吧要发布了，所以这里直接返回发布完成
                if (!storageId) return true

                // 发布房间物流管理单位
                creepApi.add(`${room.name} manager`, 'manager', {
                    sourceId: storageId
                }, room.name)

                room.log(`发布 manager`, 'transporter', 'green')
                return false
            },

            // centerLink 修建完成
            ({ room, centerLinkId, centerPos }: TransporterPlanStats) => {
                if (!centerLinkId || !centerPos) return true

                // 发布中央运输单位
                creepApi.add(`${room.name} processor`, 'processor', {
                    x: centerPos[0],
                    y: centerPos[1]
                }, room.name)

                room.log(`发布 processor`, 'transporter', 'green')
                return true
            },
        ]
    }
}


const planChains: { [type in keyof CreepReleasePlans]?: PlanNodeFunction } = {}
// 按照对应 plans 列表的顺序把所有角色的所有发布计划串成职责链
Object.keys(releasePlans).forEach(role => {
    planChains[role] = releasePlans[role].plans.reduce((pre, next) => pre.setNextPlan(next))
})

/**
 * 发布采集者
 * @param room 要发布角色的房间
 */
const releaseHarvester = function(room: Room): OK {
    // 先移除所有的配置项
    for (let i = 0; i < MAX_HARVESTER_NUM; i++) creepApi.remove(`${room.name} harvester${i}`)

    // 然后重新发布
    planChains.harvester(releasePlans.harvester.getStats(room))
    return OK
}

/**
 * 发布运输者
 * @param room 要发布角色的房间
 */
const releaseTransporter = function(room: Room): OK {
    // 不需要提前移除，因为运输者的数量不会发生大范围波动
    planChains.transporter(releasePlans.transporter.getStats(room))
    return OK
}

/**
 * 房间运营角色名对应的发布逻辑
 */
const roleToRelease: { [role in BaseRoleConstant | AdvancedRoleConstant]: (room: Room, number: number) => OK | ERR_NOT_FOUND | ERR_NOT_ENOUGH_ENERGY } = {
    'harvester': releaseHarvester,
    'collector': releaseHarvester,
    'filler': releaseTransporter,
    'manager': releaseTransporter,
    'processor': releaseTransporter,

    /**
     * 发布升级者
     * @param room 要发布角色的房间
     */
    'upgrader': function(room: Room): OK {
        // 先移除所有的配置项
        for (let i = 0; i < MAX_UPGRADER_NUM; i++) creepApi.remove(`${room.name} upgrader${i}`)
    
        // 然后重新发布
        planChains.upgrader(releasePlans.upgrader.getStats(room))
        return OK
    },

    /**
     * 发布矿工
     * @param room 要发布角色的房间
     */
    'miner': function(room: Room): OK | ERR_NOT_FOUND {
        if (!room.terminal) return ERR_NOT_FOUND
    
        creepApi.add(`${room.name} miner`, 'miner', {
            sourceId: room.mineral.id,
            targetId: room.terminal.id
        }, room.name)
    
        return OK
    },

    /**
     * 发布刷墙工
     * @param room 要发布角色的房间
     * @param num 要发布的刷墙工数量
     */
    'repairer': function(room: Room, num: number = 1): OK | ERR_NOT_ENOUGH_ENERGY {
        let sources: string[] = undefined
        
        // 优先使用 container 中的能量
        if (!sources && room.sourceContainers.length > 0) sources = room.sourceContainers.map(c => c.id)
        // container 没有再去找 storage 或 terminal
        else if (!sources && room.storage) sources = [ room.storage.id ]
        else if (!sources && room.terminal && room.terminal.store[RESOURCE_ENERGY] > 0) sources = [ room.terminal.id ]
        // 都没有就没有能量来源了，拒绝发布
        else return ERR_NOT_ENOUGH_ENERGY

        for (let i = 0; i < num; i ++) {
            creepApi.add(`${room.name} repair${i}`, 'repairer', {
                sourceId: sources[i % sources.length],
            }, room.name)
        }

        return OK
    },

    /**
     * 发布建造者
     * @param room 要发布角色的房间
     */
    'builder': function(room: Room, num: number = 2) {
        for (let i = 0; i < num; i ++) {
            creepApi.add(`${room.name} builder${i}`, 'builder', {
                sourceId: room.getAvailableSource().id
            }, room.name)
        }

        return OK
    }
}

/**
 * 在指定房间发布 creep
 * 本函数的发布会控制房间内的所有同种类 creep，所以对于某些角色来说调用一次本函数可能会新增或删除多个 creep
 * 
 * @param room 要发布 creep 的房间
 * @param role 要发布的角色名
 * @param number 要发布的数量，部分角色将无视该值
 */
export const releaseCreep = function(room: Room, role: BaseRoleConstant | AdvancedRoleConstant, number: number = 1): OK | ERR_NOT_FOUND | ERR_NOT_ENOUGH_ENERGY {
    return roleToRelease[role](room, number)
}