import planWall from './planWall'
import planBase from './planBase'
import planRoad from './planRoad'
import { LEVEL_BUILD_RAMPART, LEVEL_BUILD_ROAD } from '@/setting'
import { addConstructionSite } from '@/modulesGlobal/construction'
import { addBuildTask } from '@/modulesRoom/taskWork/delayTask'

let planningCaches: StructurePlanningCache = {}

/**
 * 对指定房间执行静态建筑规划
 * 
 * 本方法的规划结果具有幂等性
 * 
 * @param room 要执行规划的房间
 * @return 所有需要放置工地的位置
 */
const planStaticStructure = function (room: Room): ERR_NOT_FOUND | StructurePlanningResult {
    // 房间保存的中心位置
    const center = room.memory.center
    if (!center) return ERR_NOT_FOUND
    const centerPos = new RoomPosition(center[0], center[1], room.name)

    // 计算基地内的建筑点位
    let result: StructurePlanningResult = planBase(room, centerPos)

    // 执行自动墙壁规划，获取 rampart 位置
    const wallsPos = planWall(room, centerPos)

    wallsPos.forEach((walls, index) => {
        // 获取要放置 rampart 的等级
        let placeLevel = LEVEL_BUILD_RAMPART[index] || LEVEL_BUILD_RAMPART[LEVEL_BUILD_RAMPART.length - 1]
        // 如果 LEVEL_BUILD_RAMPART 设置的太高会导致超过 8 级，这里检查下
        if (placeLevel > 8) placeLevel = 8

        mergeStructurePlan(result, walls, placeLevel as AllRoomControlLevel, STRUCTURE_RAMPART)
    })

    // 执行自动道路规划，获取基地之外的 road 位置
    const roadPos = planRoad(room, centerPos, result)

    roadPos.forEach((roads, index) => {
        mergeStructurePlan(result, roads, LEVEL_BUILD_ROAD[index] as AllRoomControlLevel, STRUCTURE_ROAD)
    })

    return result
}

/**
 * 对指定房间进行建筑管理
 * 
 * 会自动添加、删除房间中的建筑及工地，并完成诸如发布 builder 之类的副作用
 * 
 * @param room 要管理建筑的房间
 */
export const manageStructure = function (room: Room): OK | ERR_NOT_OWNER | ERR_NOT_FOUND {
    // 玩家指定了不运行自动布局，或者房间不属于自己，就退出
    if (room.memory.noLayout || !room.controller || !room.controller.my) return ERR_NOT_OWNER

    // 拿到建筑摆放规划
    let structurePlacePlan: StructurePlanningResult
    // 检查缓存
    if (room.name in planningCaches) structurePlacePlan = planningCaches[room.name]
    // 缓存没有就新建
    else {
        const planResult = planStaticStructure(room)
        if (planResult == ERR_NOT_FOUND) return ERR_NOT_FOUND
        planningCaches[room.name] = structurePlacePlan = planResult
    }

    // 一级的时候移除所有非重要建筑
    if (room.controller.level === 1) clearStructure(room)

    // ----- 开始放置工地 -----

    // 一直从 1 级放置到房间当前的等级
    // 这个阶段会把之前阶段里应该放置但是出现问题（放了工地但是被踩了、建筑被摧毁了...）的建筑重新放下
    for (let i = 0; i < room.controller.level; i ++) {
        const currentLevelLayout = structurePlacePlan[i]

        // 遍历布局中所有建筑类型
        Object.keys(currentLevelLayout).forEach((structureType: BuildableStructureConstant) => {
            // 如果是关键建筑，就执行检查：如果建筑里没有能量（就没有利用价值）了，直接摧毁
            if (structureType === STRUCTURE_STORAGE || structureType === STRUCTURE_TERMINAL || structureType === STRUCTURE_FACTORY) {
                const structure = room[structureType]
                const isNotMy = structure && !structure.my
                if (
                    // 如果是工厂的话直接摧毁，因为就算里边有能量 creep 也不会用
                    (structureType === STRUCTURE_FACTORY && isNotMy) ||
                    // storage 和 terminal 要看里边有没有能量
                    (isNotMy && structure.store[RESOURCE_ENERGY] <= 100)
                )  structure.destroy()
            }

            // 遍历该建筑下的所有预放置点位，推送给建造管理模块
            const sitePosList: ConstructionPos[] = currentLevelLayout[structureType].map(pos => ({ pos, type: structureType}))
            // 放置工地并发布建造任务
            addConstructionSite(sitePosList)
            addBuildTask(room.name)
        })
    }

    return OK
}

/**
 * 将工地位置转换为字符串
 * 
 * @param pos 工地要放置的位置
 * @param structureType 工地类型
 */
export const stringifyBuildPos = function (pos: RoomPosition, structureType: BuildableStructureConstant): string {
    return `${pos.x} ${pos.y} ${structureType}`
}

/**
 * 将工地字符串转换为工地位置
 * 
 * @param posStr 工地位置字符串
 * @param roomName 工地要放置到的房间名
 */
export const unstringifyBuildPos = function (posStr: string, roomName: string): ConstructionPos {
    const [ x, y, structureType ] = posStr.split(' ')
    return {
        pos: new RoomPosition(Number(x), Number(y), roomName),
        type: structureType as BuildableStructureConstant
    }
}

/**
 * 清理房间中的非己方建筑
 * 会保留非空的 Terminal、Storage 以及 factory
 * 
 * @param room 要执行清理的房间
 * @returns OK 清理完成
 * @returns ERR_NOT_FOUND 未找到建筑
 */
const clearStructure = function (room: Room): OK | ERR_NOT_FOUND {
    const notMyStructure = room.find(FIND_STRUCTURES, { filter: s => !s.my })

    if (notMyStructure.length <= 0) return ERR_NOT_FOUND

    notMyStructure.forEach(s => {
        // 如果是这下面几种建筑则看一下存储，只要不为空就不摧毁，如果玩家觉得里边的资源不重要的话就手动摧毁
        if (
            s.structureType === STRUCTURE_TERMINAL ||
            s.structureType === STRUCTURE_FACTORY ||
            s.structureType === STRUCTURE_STORAGE ||
            s.structureType === STRUCTURE_CONTAINER
        ) {
            if (s.store.getUsedCapacity() > 0) return
        }
        // 墙壁和道路交给玩家决定，默认不摧毁
        else if (s.structureType === STRUCTURE_WALL || s.structureType === STRUCTURE_ROAD) return

        // 其他建筑一律摧毁
        s.destroy()
    })

    return OK
}

/**
 * 将新的建筑位置合并到现有的规划方案
 * 
 * @param origin 要合并到的原始规划方案
 * @param newData 要进行合并的新位置数据
 * @param level 要合并到的等级
 * @param type 要合并到的建筑类型
 */
const mergeStructurePlan = function (origin: StructurePlanningResult, newData: RoomPosition[], level: AllRoomControlLevel, type: BuildableStructureConstant): OK {
    // 先取出已经存在的道路
    const targetStructurePos = origin[level - 1][type] || []
    // 然后把新道路追加进去
    origin[level - 1][type] = [ ...targetStructurePos, ...newData ]

    return OK
}
