import { updateStructure } from '@/modulesRoom/shortcut'
import { CreateOptions } from './types'
import { Color, log } from '@/utils'
import { createConstructionManager } from './constructionManager'
import { AppLifecycleCallbacks } from '../framework/types'

/**
 * 建造的优先级
 * 越靠前建造优先级越高
 */
const BUILD_PRIORITY = [STRUCTURE_SPAWN, STRUCTURE_TOWER, STRUCTURE_EXTENSION, STRUCTURE_LINK]

const effects: CreateOptions = {
    getGameSites: () => Game.constructionSites,
    getWaitingSites: () => (Memory.waitingSites || []),
    setWaitingSites: newList => {
        Memory.waitingSites = newList
    },
    getBuildSites: () => (Memory.buildingSites || {}),
    setBuildingSites: newList => {
        Memory.buildingSites = newList
    },
    log,
    updateStructure
}

const { addConstructionSite, planSite, handleCompleteSite } = createConstructionManager(effects)

/**
 * 获取最近的待建造工地
 * 使用前请确保该位置有视野
 *
 * @param pos 获取本房间内距离该位置最近且优先级最高的工地
 */
const getNearSite = function (pos: RoomPosition): ConstructionSite {
    const room = Game.rooms[pos.roomName]
    if (!room) return undefined

    const sites: ConstructionSite[] = room.find(FIND_MY_CONSTRUCTION_SITES)
    if (sites.length <= 0) return undefined

    const groupedSite = _.groupBy(sites, site => site.structureType)

    let targetSites: ConstructionSite[] = sites
    // 先查找优先建造的工地
    for (const type of BUILD_PRIORITY) {
        const matchedSite = groupedSite[type]
        if (!matchedSite) continue

        if (matchedSite.length === 1) return matchedSite[0]
        targetSites = matchedSite
    }

    // 在目标里找最近的
    // 这里比较离谱，findClosestByPath 会必须能走到目标旁边的才会算，哪怕配置了 range 为 3 也没用
    // 如果有一个工地没办法抵达附近，但是能到其三格以内，findClosestByPath 也会认为这个工地到不了（但是实际上是可以到的）
    // 这里的解决方法是有目标但是又到不了附近，就往那边走着（因为寻路是可以正常找到路径的）
    const result = pos.findClosestByPath(targetSites)
    if (!result) {
        log(`发现了无法抵达的工地：${targetSites.map(site => site.pos)}，出发位置 ${pos}，工地已移除`, '建造控制器', Color.Yellow)
        return targetSites[0]
    }
    return result
}

/**
 * 建造管理模块注册插件
 */
const constructionAppPlugin: AppLifecycleCallbacks = {
    tickStart: handleCompleteSite,
    tickEnd: planSite
}

export { addConstructionSite, getNearSite, constructionAppPlugin }
