/**
 * 一个简单的建筑工地管理模块
 * 提供了工地自动排队（超出上限的工地暂时挂起），确认建筑是否建造完成，获取最近待建造工地、工地优先级的功能
 */

import { updateStructure } from 'modules/shortcut'
import { log } from 'utils'

/**
 * 该模块的数据保存在 Memory 哪个字段上
 */
const SAVE_KEY = {
    WAITING: 'waitingConstruction',
    BUILDING: 'buildingConstruction'
}

/**
 * 建造的优先级
 * 越靠前建造优先级越高
 */
const BUILD_PRIORITY = [ STRUCTURE_SPAWN, STRUCTURE_EXTENSION, STRUCTURE_TOWER ]

/**
 * 待放置的工地点位
 * 因为最多只能放置 100 个工地，所以超出的部分会先存放到这里
 */
let waitingConstruction: ConstructionPos[] = []

/**
 * 正在建造的工地点位
 * 在建造单位建造完成后会在这个 map 进行查找，以确定是否建造完成
 */
let buildingConstruction: { [posName: string]: ConstructionPos } = {}

/**
 * 保存待建造队列 
 */
const saveWaiting = () => {
    if (waitingConstruction.length <= 0) delete Memory[SAVE_KEY.WAITING]
    else Memory[SAVE_KEY.WAITING] = JSON.stringify(waitingConstruction)
}

/**
 * 保存建造中队列
 */
const saveBuilding = () => {
    if (Object.keys(buildingConstruction).length <= 0) delete Memory[SAVE_KEY.BUILDING]
    else Memory[SAVE_KEY.BUILDING] = JSON.stringify(buildingConstruction)
}

/**
 * 获取正在建造的工地点位的索引
 */
const getBuildingKey = ({ pos, type }: ConstructionPos): string => `${pos.x} ${pos.x} ${pos.roomName} ${type}`

/**
 * 初始化控制器
 * 在全局重置时调用
 */
export const initConstructionController = function () {
    waitingConstruction = JSON.parse(Memory[SAVE_KEY.WAITING])
    buildingConstruction = JSON.parse(Memory[SAVE_KEY.BUILDING])
}

/**
 * 管理建筑工地
 * 将放置挂起队列里的工地
 */
export const manageConstruction = function () {
    // 没有需要放置的、或者工地已经放满了，直接退出
    if (waitingConstruction.length <= 0) return
    const buildingSiteLength = Object.keys(Game.constructionSites).length
    if (buildingSiteLength >= MAX_CONSTRUCTION_SITES) return

    // 取出本 tick 的最大允许放置数量
    const preparePlaceSites = waitingConstruction.splice(0, MAX_CONSTRUCTION_SITES - buildingSiteLength)
    
    const cantPlaceSites = preparePlaceSites.filter((site) => {
        const { pos, type } = site
        const result = pos.createConstructionSite(type)

        // 放置成功，加入建造中队列
        if (result === OK) buildingConstruction[getBuildingKey(site)] = site
        // 放置失败，下次重试
        else if (result !== ERR_FULL) {
            log(`工地 ${type} 无法放置，位置 [${pos}]，createConstructionSite 结果 ${result}`, ['建造控制器'], 'yellow')
            return true
        }

        return false
    })

    // 把放置失败的工地放到队首下次再次尝试放置
    if (cantPlaceSites.length > 0) waitingConstruction.unshift(...cantPlaceSites)

    saveWaiting()
    saveBuilding()
}

/**
 * 向队列里新增建造任务
 */
export const addConstructionSite = function (sites: ConstructionPos[]) {
    waitingConstruction.push(...sites)
    saveWaiting()
}

/**
 * 获取最近的待建造工地
 * 使用前请确保该位置有视野
 * 
 * @param pos 获取本房间内距离该位置最近且优先级最高的工地
 */
export const getNearSite = function (pos: RoomPosition): ConstructionSite {
    const room = Game.rooms[pos.roomName]
    if (!room) return undefined

    const sites: ConstructionSite[] = room.find(FIND_MY_CONSTRUCTION_SITES)
    if (sites.length <= 0) return undefined

    const groupedSite = _.groupBy(sites, site => site.structureType)

    // 先查找优先建造的工地
    for (const type of BUILD_PRIORITY) {
        const matchedSite = groupedSite[type]
        if (!matchedSite) continue

        if (matchedSite.length === 1) return saveSiteId(matchedSite[0])
        return saveSiteId(pos.findClosestByPath(matchedSite))
    }

    // 没有优先建造的工地，直接找最近的
    return saveSiteId(pos.findClosestByPath(sites))
}

const saveSiteId = function (site: ConstructionSite) {
    const { pos, structureType: type, id } = site
    const constructionPos: ConstructionPos = { pos, type, id }
    // 把 id 更新到队列中
    buildingConstruction[getBuildingKey(constructionPos)] = constructionPos
    saveBuilding()

    return site
}

/**
 * 检查一个建筑工地是否建造完成
 * 如果建造完成的话，该方法会触发建筑的 onBuildComplete 回调
 * 
 * @param siteId 建筑工地的 id
 * @returns 若建造完成则返回对应的建筑
 */
export const checkSite = function <T extends BuildableStructureConstant>(siteId: Id<ConstructionSite<T>>): Structure {
    const matchedSitePos = Object.values(buildingConstruction).find(({ id }) => id === siteId)

    // 检查上面是否有已经造好的同类型建筑
    const structure = matchedSitePos.pos.lookFor(LOOK_STRUCTURES).find(({ structureType }) => {
        return structureType === matchedSitePos.type
    })
    if (!structure) return undefined

    // 建筑完成，移出队列并更新建筑快捷方式
    delete buildingConstruction[getBuildingKey(matchedSitePos)]
    saveBuilding()
    updateStructure(structure.room.name, structure.structureType, structure.id)

    // 如果有的话就执行回调
    if (structure.onBuildComplete) structure.onBuildComplete()

    return structure
}