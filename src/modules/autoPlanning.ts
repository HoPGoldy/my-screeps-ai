/**
 * 自动规划模块
 * 实现了基地自动选址、自动布局（放置建筑）以及运营单位自动发布的功能
 */
import { baseLayout, MAX_UPGRADER_NUM, MAX_HARVESTER_NUM, UPGRADE_WITH_TERMINAL, UPGRADE_WITH_STORAGE } from '../setting'
import { creepApi } from './creepController'

// dp 节点
interface DpNode {
    // 以坐标 [i][j]（i 为纵坐标，j 为横坐标，下同）为右下角时所能生成的最大正方形的边长
    len: number
    // 以坐标 [i][j] 为右下角，[0][0] 为左上角的矩形区域内的沼泽数量之和
    swamp: number
}

// 房间的边长
const ROOM_MAX_SIZE = 50

/**
 * 在房间中找到所有可以放下基地的点
 * 会尽可能的挑选沼泽数量少的区域
 * 
 * @param roomName 运行规划的房间名
 * @param baseSize 正方形基地的尺寸
 * @returns 所有满足条件的房间位置
 */
export const findBaseCenterPos = function(roomName: string, baseSize: number = 11): RoomPosition[] {
    const terrain = new Room.Terrain(roomName)

    let dp: DpNode[][] = Array(ROOM_MAX_SIZE).fill(undefined).map(_ => [])
    // 合适的结果集
    let result: RoomPosition[] = []
    // 结果集里对应的沼泽数量
    let minSwamp = Infinity

    // 遍历所有地块
    for (let i = 0; i < ROOM_MAX_SIZE; i ++) {
        for (let j = 0; j < ROOM_MAX_SIZE; j ++) {
            const { topLeft, top, left } = getOtherArea(dp, i, j, 1)

            // 生成当前位置的状态
            dp[i][j] = {
                // 以当前位置为右下角，可以生成的最大正方形的边长
                len: terrain.get(j, i) === TERRAIN_MASK_WALL ? 0 : (Math.min(topLeft.len, top.len, left.len) + 1),
                // 以当前位置为右下角，[0][0] 为左上角的区域内所有的沼泽数量
                swamp: top.swamp + left.swamp - topLeft.swamp + (terrain.get(j, i) === TERRAIN_MASK_SWAMP ? 1 : 0)
            }

            // 发现该正方形已经可以满足要求了
            if (dp[i][j].len >= baseSize) {
                // 获取正方形右上侧的三个区域
                const { topLeft, top, left } = getOtherArea(dp, i, j, baseSize)
                // 计算出当前区域内的沼泽数量
                const currentSwamp = dp[i][j].swamp - top.swamp - left.swamp + topLeft.swamp

                // 沼泽数量不是最小的
                if (currentSwamp > minSwamp) continue

                const pos = getCenterBybottomRight(i, j, baseSize)
                const centerPos = new RoomPosition(pos[1], pos[0], roomName)

                // 对比沼泽数量并更新结果
                if (currentSwamp < minSwamp) {
                    minSwamp = currentSwamp
                    result = [ centerPos ]
                }
                else if (currentSwamp === minSwamp) result.push(centerPos)
            }
        }
    }

    return result
}

/**
 * 获取状态转移所需的三个相邻节点
 * 
 * @param dp 状态集
 * @param i 目标正方形右下角的 y 坐标
 * @param j 目标正方形右下角的 x 坐标
 * @param len 正方形的边长
 */
const getOtherArea = function(dp: DpNode[][], i: number, j: number, len: number): { topLeft: DpNode, top: DpNode, left: DpNode } {
    // 越界时的默认值
    const nullNode: DpNode = { len: 0, swamp: 0 }
    // 检查索引是否小于零，小于零就返回默认值
    return {
        topLeft: (i - len > -1 && j - len > -1) ? dp[i - len][j - len] : nullNode,
        top: (i - len > -1) ? dp[i - len][j] : nullNode,
        left: (j - len > -1) ? dp[i][j - len] : nullNode,
    }
}

/**
 * 获取该正方形中心点的坐标
 * 
 * @param i 正方形右下角的 y 坐标
 * @param j  正方形右下角的 x 坐标
 * @param len 正方形的边长
 * @returns [0] 为中央点 x 坐标，[1] 为 y 坐标
 */
const getCenterBybottomRight = function(i: number, j: number, len: number): [ number, number ] {
    return [
        i - (len / 2) + 0.5,
        j - (len / 2) + 0.5,
    ]
}

/**
 * 确定唯一的基地中心点
 * 
 * @param room 运行规划的房间
 * @param targetPos 待选的中心点数组
 * @returns 基地中心点
 */
export const confirmBasePos = function(room: Room, targetPos: RoomPosition[]): RoomPosition {
    if (!targetPos || targetPos.length <= 0) return undefined

    const controller = room.controller
    const mineral = room.mineral
    if (!controller || !mineral) return undefined

    // 所有待选点到 controller 和 mineral 的距离总和
    const totalDistances = targetPos.map((pos, index) => ({
        distance: pos.findPathTo(controller).length + pos.findPathTo(mineral).length,
        index
    }))

    // 找到最小值并返回对应的位置
    const target = _.min(totalDistances, item => item.distance)
    return targetPos[target.index]
}

/**
 * 给指定房间设置中心点
 * 
 * @param room 要设置中心点的房间
 * @param centerPos 中心点坐标
 */
export const setBaseCenter = function(room: Room, centerPos: RoomPosition): OK | ERR_INVALID_ARGS {
    if (!centerPos) return ERR_INVALID_ARGS

    room.memory.center = [ centerPos.x, centerPos.y ]
    return OK
}

/**
 * -------------------------------------------------------------- 以下是自动布局部分 --------------------------------------------------------------
 */

/**
 * 清理房间中的非己方建筑
 * 会保留非空的 Terminal、Storage 以及 factory
 * 
 * @param room 要执行清理的房间
 * @returns OK 清理完成
 * @returns ERR_NOT_FOUND 未找到建筑
 */
export const clearStructure = function(room: Room): OK | ERR_NOT_FOUND {
    const notMyStructure = room.find(FIND_STRUCTURES, { filter: s => !s.my })

    if (notMyStructure.length <= 0) return ERR_NOT_FOUND

    notMyStructure.forEach(s => {
        // 如果是这三种建筑则看一下存储，只要不为空就不摧毁，反正就三个建筑，如果玩家觉得里边的资源不重要的话就手动摧毁
        if (s.structureType === STRUCTURE_TERMINAL || s.structureType === STRUCTURE_FACTORY || s.structureType === STRUCTURE_STORAGE) {
            if (s.store.getFreeCapacity() > 0) return
        }
        // 墙壁交给玩家决定，默认不摧毁
        else if (s.structureType === STRUCTURE_WALL) return

        // 其他建筑一律摧毁
        s.destroy()
    })

    return OK
}

/**
 * 设计基地布局的开发者工具
 */
export const layout = {
    /**
     * 获取基地的布局信息
     * 每个建筑到基准点的相对位置和建筑类型
     * 
     * @param centerFlagName 基准点（中心点）旗帜名称
     * @param baseSize 基地尺寸，将忽略该尺寸以外的建筑
     */
    get(centerFlagName: string, baseSize: number = 11): string {
        // 没有存储就新建
        if (!Memory.layoutInfo) {
            Memory.layoutInfo = { 1: {}, 2: {}, 3: {}, 4: {}, 5: {}, 6: {}, 7: {}, 8: {} }
            Memory.layoutLevel = 1
        }

        const flag = Game.flags[centerFlagName]
        if (!flag) return `未找到基准点旗帜`

        const allStructure = flag.room.find(FIND_STRUCTURES)

        let layout = {}
        // 遍历所有范围内建筑，统计相对位置
        allStructure.forEach(s => {
            // 不统计超限建筑和 controller
            if (!s.isActive || s.structureType === STRUCTURE_CONTROLLER) return
            if (!layout[s.structureType]) layout[s.structureType] = []

            // 范围外的就当作位置动态计算的建筑
            const relativePos = s.pos.inRangeTo(flag, (baseSize / 2 - 0.5)) ? [ s.pos.x - flag.pos.x, s.pos.y - flag.pos.y ] : null
            layout[s.structureType].push(relativePos)
        })

        // 移除之前重复的建筑
        Object.keys(layout).forEach((structureType: StructureConstant) => {
            // 计算该种类建筑在之前出现过多少次
            const preLength = _.sum(Object.values(Memory.layoutInfo).map(levelLayout => (structureType in levelLayout) ? levelLayout[structureType].length : 0))
            layout[structureType].splice(0, preLength)
            // 移除本等级没有新增的建筑类型
            if (layout[structureType].length <= 0) delete layout[structureType]
        })

        // 更新并保存点位信息
        Memory.layoutInfo[Memory.layoutLevel] = layout
        Memory.layoutLevel += 1

        return `等级 ${Memory.layoutLevel - 1} 的布局信息已保存`
    },
    /**
     * 移除当前等级的数据
     */
    remove(): string {
        Memory.layoutLevel -= 1
        Memory.layoutInfo[Memory.layoutLevel] = {}
        
        return `等级 ${Memory.layoutLevel} 的布局数据已经移除，请重新设计该等级布局`
    },
    // 显示现存的所有数据
    show(): string {
        return JSON.stringify(Memory.layoutInfo)
    }
}

/**
 * 对指定房间运行自定建筑摆放
 * 会自动放置建筑工地并发布建造者
 * 
 * @param room 要运行规划的房间
 */
export const planLayout = function(room: Room): OK | ERR_NOT_OWNER | ERR_NOT_FOUND {
    // 玩家指定了不运行自动布局，或者房间不属于自己，就退出
    if (room.memory.noLayout || !room.controller || !room.controller.my) return ERR_NOT_OWNER

    // 当前需要检查那几个等级的布局
    const planLevel = Array(room.controller.level).fill(undefined).map((_, index) => index + 1)
    // 房间保存的中心位置
    const center = room.memory.center
    if (!center) return ERR_NOT_FOUND

    let needBuild = false
    // 从 1 级开始检查
    planLevel.forEach((level: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8) => {
        // 当前等级的布局
        const currentLevelLayout = baseLayout[level]

        // 遍历布局中所有建筑，检查是否又可建造的
        Object.keys(currentLevelLayout).forEach((structureType: BuildableStructureConstant) => {
            currentLevelLayout[structureType].forEach(pos => {
                let result: ScreepsReturnCode
                // 为 null 说明在集中布局之外
                if (pos == null) result = placeOutsideConstructionSite(room, structureType)
                // 直接发布工地，通过返回值检查是否需要建造
                else result = room.createConstructionSite(center[0] + pos[0], center[1] + pos[1], structureType)

                // 存在需要建造的建筑
                if (result === OK) needBuild = true
            })
        })
    })

    // 有需要建造的，发布建造者
    if (needBuild) releaseCreep(room, 'builder')

    return OK
}

/**
 * 放置集中布局之外的建筑
 * Link、Extractor 之类的
 * 
 * @param room 要放置工地的房间
 * @param type 要放置的建筑类型
 */
const placeOutsideConstructionSite = function(room: Room, type: StructureConstant): ScreepsReturnCode {
    if (type === STRUCTURE_LINK) {
        const targets = [ ...room.sources, room.controller]
        // 给 source 和 controller 旁边造 link
        for (const target of targets) {
            // 旁边已经造好了 link 或者有工地了，就检查下一个 目标
            if (
                (target.pos.findInRange(FIND_MY_STRUCTURES, 2, { filter: s => s.structureType === STRUCTURE_LINK}).length > 0) ||
                (target.pos.findInRange(FIND_MY_CONSTRUCTION_SITES, 2, { filter: s => s.structureType === STRUCTURE_LINK}).length > 0)
            ) continue

            // 获取目标点位旁边的所有可用的开采空位
            const harvesterPos = target.pos.getFreeSpace()
            // 找到第一个可以站 creep 的地方
            const targetHarvesterPos = harvesterPos.find(pos => pos.lookFor(LOOK_STRUCTURES).length <= 0)
            if (!targetHarvesterPos) continue

            // 以开采单位为基础寻找所有可以放置 link 的位置
            const targetPos = targetHarvesterPos.getFreeSpace()
            // 第一个空位就是放置 link 的位置
            const linkPos = targetPos.find(pos => pos.lookFor(LOOK_STRUCTURES).length <= 0)
            if (!targetPos) continue

            // 一次只会建造一个 link
            return linkPos.createConstructionSite(STRUCTURE_LINK)
        }
    }
    // 是 EXTRACTOR 就直接点下去
    else if (type === STRUCTURE_EXTRACTOR) {
        return room.mineral.pos.createConstructionSite(STRUCTURE_EXTRACTOR)
    }

    return ERR_FULL
}

/**
 * -------------------------------------------------------------- 以下是自动 creep 发布部分 --------------------------------------------------------------
 */

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
 * 从指定房间搜集发布 upgrader 的状态
 * @param room 要搜集状态的房间
 */
const getStatsForUpgrader = function(room: Room): UpgraderPlanStats {
    let stats: UpgraderPlanStats = {
        room,
        controllerLevel: room.controller.level,
        ticksToDowngrade: room.controller.ticksToDowngrade,
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
}

/**
 * 从指定房间搜集发布 harvester 的状态
 * @param room 要搜集状态的房间
 */
const getStatsForHarvester = function(room: Room): HarvesterPlanStats {
    let stats: HarvesterPlanStats = {
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
    if (room.memory.centerLinkId && Game.getObjectById(room.memory.centerLinkId)) stats.centerLinkId = room.memory.centerLinkId
    if (room.storage) stats.storageId = room.storage.id

    return stats
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

/**
 * upgrader 所有的发布计划
 * 在调用时会按照顺序依次向下检查，直到发现适合的计划方案
 */
const upgraderPlans: PlanNodeFunction[] = [

    // 8 级时的特殊判断
    ({ room, controllerLevel, ticksToDowngrade, storageId}: UpgraderPlanStats) => {
        if (controllerLevel < 8) return false
        // 掉级还早，不发布 upgrader 了
        if (ticksToDowngrade >= 100000) return true

        // 快掉级了就发布一个
        addUpgrader(room.name, [ 0 ], storageId)

        console.log(room.name, '超过 8 级，发布 creep < [plan 0]')
        return true
    },

    // 优先用 upgradeLink
    ({ room, upgradeLinkId }: UpgraderPlanStats) => {
        if (!upgradeLinkId) return false

        // 发布三个升级单位给 link
        addUpgrader(room.name, [0, 1, 2], upgradeLinkId)

        console.log(room.name, '从 upgradeLink 获取能量，发布指定数量的 upgrader < [plan 1]')
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
                return true
            }
        })

        console.log(room.name, '从 terminal 获取能量，发布指定数量的 upgrader < [plan 2]')
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
                return true
            }
        })

        console.log(room.name, '从 storage 获取能量，发布指定数量的 upgrader < [plan 3]')
        return true
    },

    // 兜底，手动采集能量
    ({ room }) => {
        // 有援建单位，只发布一个 upgrader
        if (creepApi.has(`${room.name} RemoteUpgrader`)) {
            // 找到距离最近的 source
            const sourceId = room.controller.pos.findClosestByPath(room.sources).id
            addUpgrader(room.name, [ 0 ], sourceId)
        }
        // 没有援建，每个 source 发布两个
        else {
            addUpgrader(room.name, [ 0, 1 ], room.sources[0].id)
            if (room.sources[1]) addUpgrader(room.name, [ 2, 3 ], room.sources[1].id)
        }

        console.log(room.name, '启动兜底，发布基础 upgrader < [plan 4]')
        return true
    }
]

/**
 * harvester 所有的发布计划
 * 在调用时会按照顺序依次向下检查，直到发现适合的计划方案
 */
const harvesterPlans: PlanNodeFunction[] = [

    // 有 storage 也有 centerLink
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
                sourceId: sourceDetail.id,
                targetId: storageId
            }, room.name)
        })

        console.log(room.name, '存在 centerLink < [plan 0]')
        return true
    },
    
    // 有 storage 但没 centerLink
    ({ room, storageId, centerLinkId, sources }: HarvesterPlanStats) => {
        if (!(storageId && !centerLinkId)) return false

        // 遍历所有 source 进行发布，多余能量直接存到 storage 里
        sources.forEach((sourceDetail, index) => {
            creepApi.add(`${room.name} harvester${index}`, 'harvester', {
                sourceId: sourceDetail.id,
                targetId: storageId
            }, room.name)
        })

        console.log(room.name, '不存在 centerLink < [plan 1]')
        return true
    },

    // 没有 storage
    ({ room, sources }: HarvesterPlanStats) => {
        // 遍历所有 source 进行发布，多余能量直接存到 storage 里
        sources.forEach((sourceDetail, index) => {
            creepApi.add(`${room.name} harvester${index}`, 'harvester', {
                sourceId: sourceDetail.id
            }, room.name)
        })

        console.log(room.name, '兜底 < [plan 2]')
        return true
    },
]

// 按照对应 plans 列表的顺序把所有发布计划串成职责链
const upgraderPlanChain = upgraderPlans.reduce((pre, next) => pre.setNextPlan(next))
const harvesterPlanChain = harvesterPlans.reduce((pre, next) => pre.setNextPlan(next))

/**
 * 发布升级者
 * @param room 要发布角色的房间
 */
const releaseUpgrader = function(room: Room): OK {
    // 先移除所有的配置项
    for (let i = 0; i < MAX_UPGRADER_NUM; i++) creepApi.remove(`${room.name} upgrader${i}`)

    // 然后重新发布
    upgraderPlanChain(getStatsForUpgrader(room))
    return OK
}

/**
 * 发布采集者
 * @param room 要发布角色的房间
 */
const releaseHarvester = function(room: Room): OK {
    // 先移除所有的配置项
    for (let i = 0; i < MAX_HARVESTER_NUM; i++) creepApi.remove(`${room.name} harvester${i}`)

    // 然后重新发布
    harvesterPlanChain(getStatsForHarvester(room))
    return OK
}

/**
 * 房间运营角色名对应的发布逻辑
 */
const roleToRelease: { [role in BaseRoleConstant | AdvancedRoleConstant]: (room: Room) => OK | ERR_NOT_FOUND } = {
    'harvester': releaseHarvester,
    'collector': releaseHarvester,
    'upgrader': releaseUpgrader,

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
     * 发布运输者
     * @param room 要发布角色的房间
     */
    'manager': function(room: Room): OK | ERR_NOT_FOUND {
        if (!room.storage) return ERR_NOT_FOUND
    
        creepApi.add(`${room.name} manager`, 'manager', {
            sourceId: room.storage.id
        }, room.name)
    
        return OK
    },

    /**
     * 发布中央运输者
     * @param room 要发布角色的房间
     */
    'processor': function(room: Room): OK | ERR_NOT_FOUND {
        if (!room.memory.center) return ERR_NOT_FOUND
    
        creepApi.add(`${room.name} processor`, 'processor', {
            x: room.memory.center[0],
            y: room.memory.center[1]
        }, room.name)
    
        return OK
    },

    /**
     * 发布刷墙工
     * @param room 要发布角色的房间
     * @param num 要发布的刷墙工数量
     */
    'repairer': function(room: Room, num: number = 1): OK {
        Array(num).fill(undefined).forEach((_, index) => {
            creepApi.add(`${room.name} repair${index}`, 'repairer', {
                sourceId: room.storage ? room.storage.id : '',
            }, room.name)
        })
    
        return OK
    },

    /**
     * 发布建造者
     * @param room 要发布角色的房间
     */
    'builder': function(room: Room) {
        creepApi.add(`${room.name} builder`, 'builder', {
            sourceId: room.storage ? room.storage.id : room.sources[0].id
        }, room.name)

        return OK
    }
}

/**
 * 在指定房间发布 creep
 * 本函数的发布会控制房间内的所有同种类 creep，所以对于某些角色来说调用一次本函数可能会新增或删除多个 creep
 * 
 * @param room 要发布 creep 的房间
 * @param role 要发布的角色名
 */
export const releaseCreep = function(room: Room, role: BaseRoleConstant | AdvancedRoleConstant): OK | ERR_NOT_FOUND {
    return roleToRelease[role](room)
}