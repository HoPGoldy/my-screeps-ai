/**
 * 集中式布局基地自动规划模块
 * 负责放置房间中的建筑点位
 */

import { baseLayout } from 'setting'
import { releaseCreep } from './planCreep'

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
            if (s.store.getUsedCapacity() > 0) return
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
 * 移除房间中的重要建筑
 * 如果建筑 store 空了就移除
 * 
 * @param room 要清理重要建筑的房间
 */
const clearImportantStructure = function(room: Room): OK {
    [ STRUCTURE_STORAGE, STRUCTURE_TERMINAL, STRUCTURE_FACTORY ].forEach(structureKey => {
        const structure = room[structureKey]
        // 存储没搬完就保留
        if (!structure || structure.my || structure.store.getUsedCapacity() > 0) return
        // 已经空了就摧毁
        structure.destroy()
    })

    return OK
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

    // 尝试清空可能用完的非己方建筑
    clearImportantStructure(room)

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

    // 有需要建造的，发布两个建造者
    if (needBuild) {
        releaseCreep(room, 'builder')
        releaseCreep(room, 'builder')
    }

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
