import { baseLayout } from 'setting'

/**
 * 规划集中式布局的建筑摆放
 * 
 * 负责确定房间中的固定建筑位置
 * 
 * @param room 要执行规划的房间
 * @param centerPos 基地中心位置
 */
export default function (room: Room, centerPos: RoomPosition): StructurePlanningResult {
    // 执行自动布局规划，获取基础建筑物位置
    const outLinkPos = getOutLinkPos(room)

    return baseLayout.map(currentLevelLayout => {
        // 本等级建筑的绝对坐标
        const currentLevelPos = {}

        // 遍历布局中所有建筑，将相对坐标转换为绝对坐标
        Object.keys(currentLevelLayout).forEach((structureType: BuildableStructureConstant) => {
            currentLevelPos[structureType] = currentLevelLayout[structureType].map((pos: [number, number] | null) => {
                // 不在集中布局内，是 link 就从刚才生成的数组中弹出一个，是 extractor 就用 mineral 的位置
                if (pos === null) {
                    if (structureType === STRUCTURE_LINK) return outLinkPos.shift()
                    else if (structureType === STRUCTURE_EXTRACTOR) return room.mineral.pos
                }
                // 集中布局之内，直接计算绝对位置
                return new RoomPosition(centerPos.x + pos[0], centerPos.y + pos[1], room.name)
            })
        })

        return currentLevelPos
    })
}

/**
 * 判断当前位置是否可以站立 creep
 * 
 * @param pos 要判断的位置
 */
const canPosStand = function (pos: RoomPosition): boolean {
    const onPosStructures = pos.lookFor(LOOK_STRUCTURES)

    // 遍历该位置上的所有建筑，如果建筑上不能站人的话就返回 false
    for (const structure of onPosStructures) {
        if (
            structure.structureType !== STRUCTURE_CONTAINER &&
            structure.structureType !== STRUCTURE_RAMPART &&
            structure.structureType !== STRUCTURE_ROAD
        ) return false
    }
    return true
}

/**
 * 放置集中布局之外的 link
 * 
 * 默认有三个，分别位于两个 source 和一个 controller 旁边
 * 
 * @param room 要放置工地的房间
 */
const getOutLinkPos = function (room: Room): RoomPosition[] {
    // 给 source 和 controller 旁边造 link
    const targets = [...room.sources, room.controller]
    const result = []

    for (const target of targets) {
        // 旁边已经造好了 link 或者有工地了，就检查下一个目标
        if (
            (target.pos.findInRange(FIND_MY_STRUCTURES, 2, { filter: s => s.structureType === STRUCTURE_LINK}).length > 0) ||
            (target.pos.findInRange(FIND_MY_CONSTRUCTION_SITES, 2, { filter: s => s.structureType === STRUCTURE_LINK}).length > 0)
        ) continue

        // 获取目标点位旁边的所有可用的开采空位
        const harvesterPos = target.pos.getFreeSpace()
        // 找到第一个可以站 creep 的地方
        const targetHarvesterPos = harvesterPos.find(canPosStand)
        if (!targetHarvesterPos) continue

        // 以开采单位为基础寻找所有可以放置 link 的位置
        const targetPos = targetHarvesterPos.getFreeSpace()
        // 第一个空位就是放置 link 的位置
        const linkPos = targetPos.find(canPosStand)
        if (!linkPos) continue

        result.push(linkPos)
    }

    return result
}