import { baseLayout } from './setting'
import { getFreeSpace } from './utils'
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
 * @param room 运行规划的房间
 * @param baseSize 正方形基地的尺寸
 * @returns 所有满足条件的房间位置
 */
export const findBaseCenterPos = function(room: Room, baseSize: number = 11): RoomPosition[] {
    const terrain = new Room.Terrain(room.name)

    let dp: DpNode[][] = Array().fill(ROOM_MAX_SIZE).map(_ => [])
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
                const centerPos = new RoomPosition(pos[1], pos[0], room.name)

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
 * 获取基地的布局信息
 * 每个建筑到基准点的相对位置和建筑类型
 * 
 * @param centerFlagName 基准点（中心点）旗帜名称
 * @param baseSize 基地尺寸，将忽略该尺寸以外的建筑
 */
export const getBaseLayout = function(centerFlagName: string, baseSize: number = 11): string {
    const flag = Game.flags[centerFlagName]
    if (!flag) return `未找到基准点旗帜`

    // 获取范围内的建筑
    const inRangeStructure = flag.pos.findInRange(FIND_STRUCTURES, (baseSize / 2 - 0.5))

    let layout = {}
    // 遍历所有范围内建筑，统计相对位置
    inRangeStructure.forEach(s => {
        if (!layout[s.structureType]) layout[s.structureType] = []
        layout[s.structureType].push([ flag.pos.x - s.pos.x, flag.pos.y - s.pos.y ])
    })

    return JSON.stringify(layout, null, 4)
}

/**
 * 对指定房间运行自定建筑摆放
 * 会自动放置建筑工地并发布建造者
 * 
 * @param room 要运行规划的房间
 */
export const planLayout = function(room: Room): OK | ERR_NOT_OWNER | ERR_NOT_FOUND {
    if (!room.controller || !room.controller.my) return ERR_NOT_OWNER

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
                // 为 null 说明在集中布局之外
                if (pos == null) return placeOutsideConstructionSite(room, structureType)

                // 直接发布工地，通过返回值检查是否需要建造
                const result = room.createConstructionSite(center[0] + pos[0], center[1] + pos[1], structureType)

                // 存在需要建造的建筑
                if (result === OK) needBuild = true
            })
        })
    })

    // 有需要建造的，发布建造者
    if (needBuild) room.addBuilder()

    return OK
}

/**
 * 放置集中布局之外的建筑
 * Link、Extractor 之类的
 * 
 * @param room 要放置工地的房间
 * @param type 要放置的建筑类型
 */
const placeOutsideConstructionSite = function(room: Room, type: StructureConstant): void {
    if (type === STRUCTURE_LINK) {
        // 给 source 旁边造 link
        for (const source of room.sources) {
            // 旁边已经造好了 link，就检查下一个 source
            if (source.pos.findInRange(FIND_MY_STRUCTURES, 2, {
                filter: s => s.structureType === STRUCTURE_LINK
            })) continue

            // 获取 source 旁边的开采单位位置
            const harvesterPos = getFreeSpace(source.pos, true)[0]
            if (!harvesterPos) continue
            // 以开采单位为基础寻找 link 的位置
            const targetPos = getFreeSpace(harvesterPos, true)[0]
            if (!targetPos) continue

            // 建造 link
            targetPos.createConstructionSite(STRUCTURE_LINK)
            // 一次只会建造一个 link
            break
        }
    }
    // 是 EXTRACTOR 就直接点下去
    else if (type === STRUCTURE_EXTRACTOR) {
        room.mineral.pos.createConstructionSite(STRUCTURE_EXTRACTOR)
    }
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
        roomName: room.name
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
        roomName: room.name,
        sourceLinkIds: []
    }

    // 获取房间内所有 link
    const roomLinks = room.find(FIND_MY_STRUCTURES, {
        filter: s => s.structureType === STRUCTURE_LINK
    })

    // 根据其种类放入状态对象
    roomLinks.forEach(link => {
        if (link.id === room.memory.centerLinkId) stats.centerLinkId = link.id
        else if (link.id !== room.memory.upgradeLinkId) stats.sourceLinkIds.push(link.id)
    })
    
    return stats
}

/**
 * upgrader 所有的发布计划
 * 在调用时会按照顺序依次向下检查，直到发现适合的计划方案
 */
const upgraderPlans: PlanNodeFunction[] = [
    // 没终端也没存储，最原始状态，手动采集能量
    ({ storageId, terminalId }: UpgraderPlanStats) => {
        if (!(storageId && terminalId)) return false

        console.log('手动采集能量')
        return true
    },
    // 终端里的能量多，优先用终端能量
    ({ terminalId, terminalEnergy }: UpgraderPlanStats) => {
        if (!terminalId || terminalEnergy < 10000 ) return false

        console.log('从 terminal 获取能量，发布 2 个 upgrader')
        return true
    },
    // 根据 storage 里的能量发布对应数量的 upgrader
    ({ storageId, storageEnergy }: UpgraderPlanStats) => {
        if (!storageId || storageEnergy < 90000 ) return false

        console.log('从 storage 获取能量，发布 4 个 upgrader')
        return true
    },
    // 同上
    ({ storageId, storageEnergy }: UpgraderPlanStats) => {
        if (!storageId || storageEnergy < 50000 ) return false

        console.log('从 storage 获取能量，发布 3 个 upgrader')
        return true
    },
    // 同上
    ({ storageId, storageEnergy }: UpgraderPlanStats) => {
        if (!storageId || storageEnergy < 30000 ) return false

        console.log('从 storage 获取能量，发布 2 个 upgrader')
        return true
    },
    // 兜底，手动采集能量
    () => {
        console.log('兜底 手动采集能量')
        return true
    }
]

/**
 * harvester 所有的发布计划
 * 在调用时会按照顺序依次向下检查，直到发现适合的计划方案
 */
const harvesterPlans: PlanNodeFunction[] = [
    // ...
]

// 按照对应 plans 列表的顺序把所有发布计划串成职责链
const upgraderPlanChain = upgraderPlans.reduce((pre, next) => pre.setNextPlan(next))
const harvesterPlanChain = harvesterPlans.reduce((pre, next) => pre.setNextPlan(next))

/**
 * 发布升级者
 * @param room 要发布角色的房间
 */
const releaseUpgrader = function(room: Room): OK {
    upgraderPlanChain(getStatsForUpgrader(room))
    return OK
}

/**
 * 发布采集者
 * @param room 要发布角色的房间
 */
const releaseHarvester = function(room: Room): OK {
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
    'transfer': function(room: Room): OK | ERR_NOT_FOUND {
        if (!room.storage) return ERR_NOT_FOUND
    
        creepApi.add(`${room.name} transfer`, 'transfer', {
            sourceId: room.storage.id
        }, room.name)
    
        return OK
    },
    /**
     * 发布中央运输者
     * @param room 要发布角色的房间
     */
    'centerTransfer': function(room: Room): OK | ERR_NOT_FOUND {
        if (!room.memory.center) return ERR_NOT_FOUND
    
        creepApi.add(`${this.name} centerTransfer`, 'centerTransfer', {
            x: room.memory.center[0],
            y: room.memory.center[1]
        }, this.name)
    
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