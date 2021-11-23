import { getMax } from './findStrategy'

/**
 * 搜索房间内的可用能量源
 * 会先应用传入的过滤方法，然后使用搜索方法找到唯一目标
 *
 * @param room 要搜索能量来源的房间
 * @param finder 搜索方法，该方法接受房间里能量大于零的数组，并返回其中之一
 * @param filters 过滤方法，该方法接受房间里能量大于零的数组，并返回其中的一部分
 */
export const getRoomEnergyTarget = function (room: Room, finder?: EnergyTargetFinder, ...filters: EnergyTargetFilter[]): EnergyTarget {
    let allEnergyTargets = room._energyFilterObj

    if (!allEnergyTargets) {
        // 查找 storage、terminal、container 以及 link
        const structureTargets = [room.storage, room.terminal, ...room[STRUCTURE_CONTAINER], ...room[STRUCTURE_LINK]]
            .filter(structure => structure && structure.store[RESOURCE_ENERGY] > 0)

        // 查找 source 旁边地上扔的
        const droppedEnergyTargets = room.source
            .map(source => source.getDroppedInfo().energy)
            .filter(Boolean)

        // 缓存在 room 实例上
        allEnergyTargets = [...structureTargets, ...droppedEnergyTargets]
        room._energyFilterObj = allEnergyTargets
    }

    // 遍历所有过滤器
    const FilteredTargets = filters.reduce((targets, filter) => filter(targets), allEnergyTargets)
    // 设置搜索方法并执行搜索
    const targetFinder: EnergyTargetFinder = finder || getMax
    return targetFinder(FilteredTargets)
}
