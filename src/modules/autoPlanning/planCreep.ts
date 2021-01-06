import { getRoomAvailableSource } from 'modules/energyController'
import { MAX_UPGRADER_NUM, MAX_HARVESTER_NUM, UPGRADE_WITH_TERMINAL, UPGRADE_WITH_STORAGE, FILLER_WITH_CONTAINER_RANGE, UPGRADER_WITH_ENERGY_LEVEL_8 } from 'setting'
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
 * @param indexs creep 的名称后缀，数组长度即为要发布的 upgrader 数量
 * @param sourceId 能量来源 id
 */
// const addUpgrader = function(roomName: string, indexs: number[], sourceId: Id<EnergySourceStructure>): void {
//     indexs.forEach(i => creepApi.add(`${roomName} upgrader${i}`, 'upgrader', {
//         sourceId,
//         workRoom: roomName
//     }, roomName))
// }

// const releasePlans: CreepReleasePlans = {
//     /**
//      * 发布能量采集单位的相关逻辑
//      */
//     harvester: {
//         // 状态收集
//         getStats(room: Room): HarvesterPlanStats {
//             const stats: HarvesterPlanStats = {
//                 room,
//                 // 查找 source 及其身边的 link
//                 sources: room.source.map(s => {
//                     const nearLinks = s.pos.findInRange<StructureLink>(FIND_MY_STRUCTURES, 2, {
//                         filter: s => s.structureType === STRUCTURE_LINK
//                     })
//                     return {
//                         id: s.id,
//                         linkId: nearLinks.length > 0 ? nearLinks[0].id : undefined
//                     }
//                 })
//             }
        
//             // 收集 centerLink 及 storage
//             if (room.centerLink) stats.centerLinkId = room.centerLink.id
//             if (room.storage) stats.storageId = room.storage.id
        
//             return stats
//         },
//         // 发布计划
//         plans: [
//             // 有 storage 也有 centerLink，可以通过 sourceLink 转移能量了
//             ({ room, storageId, centerLinkId, sources }: HarvesterPlanStats) => {
//                 if (!(storageId && centerLinkId)) return false

//                 // 遍历所有 source 进行发布
//                 sources.forEach((sourceDetail, index) => {
//                     // 有对应的 sourceLink 的话 harvester 把自己的能量放进去
//                     if (sourceDetail.linkId) {
//                         creepApi.add(`${room.name} harvester${index}`, 'collector', {
//                             sourceId: sourceDetail.id,
//                             targetId: sourceDetail.linkId
//                         }, room.name)
//                         room.log(`能量将存放至 sourceLink`, 'harvester', 'green')
//                     }
//                     // 没有的话就还是老角色，新建 container 并采集
//                     else {
//                         creepApi.add(`${room.name} harvester${index}`, 'harvester', {
//                             sourceId: sourceDetail.id
//                         }, room.name)
//                         room.log(`能量将存放至 sourceContainer`, 'harvester', 'green')
//                     }
//                 })
                
//                 return true
//             },

//             // 没有 storage，直接发布 harvester
//             ({ room, sources }: HarvesterPlanStats) => {
//                 // 遍历所有 source 进行发布，多余能量直接存到 storage 里
//                 sources.forEach((sourceDetail, index) => {
//                     creepApi.add(`${room.name} harvester${index}`, 'harvester', {
//                         sourceId: sourceDetail.id
//                     }, room.name)
//                 })

//                 room.log(`能量将存放至 sourceContainer`, 'harvester', 'green')
//                 return true
//             },
//         ]
//     },

//     /**
//      * 发布升级单位的相关逻辑
//      */
//     upgrader: {
//         // 状态收集
//         getStats(room: Room): UpgraderPlanStats {
//             const stats: UpgraderPlanStats = {
//                 room,
//                 controllerLevel: room.controller.level,
//                 ticksToDowngrade: room.controller.ticksToDowngrade,
//                 sourceContainerIds: room.sourceContainers.map(container => container.id) || []
//             }
        
//             if (room.storage) {
//                 stats.storageId = room.storage.id
//                 stats.storageEnergy = room.storage.store[RESOURCE_ENERGY]
//             }
        
//             if (room.terminal) {
//                 stats.terminalId = room.terminal.id
//                 stats.terminalEnergy = room.terminal.store[RESOURCE_ENERGY]
//             }

//             if (Game.getObjectById(room.memory.upgradeLinkId)) {
//                 stats.upgradeLinkId = room.memory.upgradeLinkId
//             }
//             else delete room.memory.upgradeLinkId
        
//             return stats
//         },
//         // 发布计划
//         plans: [
//             // 8 级时的特殊判断
//             ({ room, controllerLevel, upgradeLinkId, storageEnergy, storageId }: UpgraderPlanStats) => {
//                 if (controllerLevel < 8 || storageEnergy < UPGRADER_WITH_ENERGY_LEVEL_8) return false

//                 // 只会发布一个，优先从 upgraderLink 里取能量
//                 addUpgrader(room.name, [ 0 ], upgradeLinkId || storageId)

//                 return true
//             },

//             // 优先用 upgradeLink
//             ({ room, upgradeLinkId, storageEnergy }: UpgraderPlanStats) => {
//                 if (!upgradeLinkId || !storageEnergy) return false
                
//                 // 能量不太够了就只会发布一个 upgrader
//                 const upgraderIndexs = storageEnergy > 300000 ? [0, 1] : [0]
//                 // 发布升级单位给 link
//                 addUpgrader(room.name, upgraderIndexs, upgradeLinkId)

//                 room.log('将从 upgradeLink 获取能量', 'upgrader', 'green')
//                 return true
//             },
        
//             // 用终端能量发布 upgrader
//             ({ room, terminalId, terminalEnergy }: UpgraderPlanStats) => {
//                 if (!terminalId || terminalEnergy < UPGRADE_WITH_TERMINAL[UPGRADE_WITH_TERMINAL.length - 1].energy ) return false
        
//                 // 遍历配置项进行 upgrader 发布
//                 UPGRADE_WITH_TERMINAL.find(config => {
//                     // 找到对应的配置项了，发布对应数量的 upgrader
//                     if (terminalEnergy > config.energy) {
//                         addUpgrader(room.name, new Array(config.num).fill(undefined).map((_, i) => i), terminalId)
//                         room.log(`将从 terminal 获取能量，发布数量 * ${config.num}`, 'upgrader', 'green')
//                         return true
//                     }
//                 })

//                 // 用终端刷墙的同时也可以继续检查是否用 storage 刷墙
//                 return false
//             },

//             // 根据 storage 里的能量发布对应数量的 upgrader
//             ({ room, storageId, storageEnergy }: UpgraderPlanStats) => {
//                 if (!storageId || storageEnergy < UPGRADE_WITH_STORAGE[UPGRADE_WITH_STORAGE.length - 1].energy ) return false

//                 // 遍历配置项进行 upgrader 发布
//                 UPGRADE_WITH_STORAGE.find(config => {
//                     // 找到对应的配置项了，发布对应数量的 upgrader
//                     if (storageEnergy > config.energy) {
//                         addUpgrader(room.name, new Array(config.num).fill(undefined).map((_, i) => i), storageId)
//                         room.log(`将从 storage 获取能量，发布数量 * ${config.num}`, 'upgrader', 'green')
//                         return true
//                     }
//                 })

//                 return true
//             },

//             // 兜底，从 sourceContainer 中获取能量
//             ({ room, sourceContainerIds }: UpgraderPlanStats) => {
//                 // 因为有 repairer 刷墙，所以每个 container 发布两个单位
//                 // 在有援建单位时每个 container 只发布一个升级单位
//                 const upgraderIndexs = creepApi.has(`${room.name} RemoteUpgrader`) || creepApi.has(`${room.name} RemoteBuilder`) ? [ 0 ] : [ 0, 1 ]

//                 // 遍历所有 container，发布对应数量的 upgrader
//                 sourceContainerIds.forEach((containerId, index) => {
//                     addUpgrader(room.name, upgraderIndexs.map(i => index + (i * 2)), containerId)
//                 })

//                 room.log(`将从 sourceContainer 获取能量，发布数量 * ${sourceContainerIds.length * upgraderIndexs.length}`, 'upgrader', 'green')
//                 return true
//             }
//         ]
//     }
// }


// const planChains: { [type in keyof CreepReleasePlans]?: PlanNodeFunction } = {}
// // 按照对应 plans 列表的顺序把所有角色的所有发布计划串成职责链
// Object.keys(releasePlans).forEach(role => {
//     planChains[role] = releasePlans[role].plans.reduce((pre, next) => pre.setNextPlan(next))
// })

// /**
//  * 发布采集者
//  * @param room 要发布角色的房间
//  */
// const releaseHarvester = function(room: Room): OK {
//     // 先移除所有的配置项
//     for (let i = 0; i < MAX_HARVESTER_NUM; i++) creepApi.remove(`${room.name} harvester${i}`)

//     // 然后重新发布
//     planChains.harvester(releasePlans.harvester.getStats(room))
//     return OK
// }

/**
 * 房间运营角色名对应的发布逻辑
 */
export const roleToRelease: { [role in CreepRoleConstant]?: (room: Room, number: number) => OK | ERR_NOT_FOUND | ERR_NOT_ENOUGH_ENERGY } = {
    /**
     * 发布工作单位
     * @param room 要发布角色的房间
     * @param number 要发布的数量
     */
    'worker': function(room: Room, number: number): OK {
        for (let i = 0; i < number; i++) {
            if (creepApi.has(`${room.name} worker${i}`)) continue
            creepApi.add(`${room.name} worker${i}`, 'worker', { workRoom: room.name }, room.name)
        }

        let extraIndex = number
        // 移除多余的搬运工
        while (creepApi.has(`${room.name} worker${extraIndex}`)) {
            creepApi.remove(`${room.name} worker${extraIndex}`)
            extraIndex += 1
        }

        return OK
    },

    /**
     * 发布搬运工
     * @param room 要发布角色的房间
     * @param number 要发布的数量
     */
    'manager': function(room: Room, number: number): OK {
        for (let i = 0; i < number; i++) {
            if (creepApi.has(`${room.name} manager${i}`)) continue
            creepApi.add(`${room.name} manager${i}`, 'manager', { workRoom: room.name }, room.name)
        }

        let extraIndex = number
        // 移除多余的搬运工
        while (creepApi.has(`${room.name} manager${extraIndex}`)) {
            creepApi.remove(`${room.name} manager${extraIndex}`)
            extraIndex += 1
        }

        return OK
    },

    /**
     * 发布中央运输单位
     * @param room 要发布角色的房间（memory 需要包含 center 字段）
     */
    'processor': function(room: Room): OK | ERR_NOT_FOUND {
        if (!room.memory.center) return ERR_NOT_FOUND

        const [ x, y ] = room.memory.center 
        creepApi.add(`${room.name} processor`, 'processor', { x, y }, room.name)

        return OK
    }
}