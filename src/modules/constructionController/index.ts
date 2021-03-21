/**
 * 一个简单的建筑工地管理模块
 * 提供了工地自动排队（超出上限的工地暂时挂起），确认建筑是否建造完成，获取最近待建造工地、工地优先级的功能
 */

import { updateStructure } from '@/modules/room/shortcut'
import { log } from '@/utils'

/**
 * 该模块的数据保存在 Memory 哪个字段上
 */
const SAVE_KEY = 'waitingConstruction'

/**
 * 建造的优先级
 * 越靠前建造优先级越高
 */
const BUILD_PRIORITY = [ STRUCTURE_SPAWN, STRUCTURE_TOWER, STRUCTURE_EXTENSION ]

/**
 * 待放置的工地点位
 * 因为最多只能放置 100 个工地，所以超出的部分会先存放到这里
 */
let waitingConstruction: ConstructionPos[] = []

/**
 * 上个 tick 的 Game.constructionSites
 * 用于和本 tick 进行比对，找到是否有工地建造完成
 */
let lastGameConstruction: { [constructionSiteId: string]: ConstructionSite } = {}

/**
 * 建造完成的建筑，键为工地 id，值为对应建造完成的建筑
 * 会存放在这里供其他模块搜索，全局重置时将被清空
 */
export const buildCompleteSite: { [constructionSiteId: string]: Structure } = {}

/**
 * 保存待建造队列 
 */
const saveWaiting = function () {
    if (!Game._needSaveConstructionData) return
    if (waitingConstruction.length <= 0) delete Memory[SAVE_KEY]
    else Memory[SAVE_KEY] = JSON.stringify(waitingConstruction)
}

/**
 * 初始化控制器
 * 在全局重置时调用
 */
export const initConstructionController = function () {
    waitingConstruction = JSON.parse(Memory[SAVE_KEY] || '[]').map(({ pos, type }) => {
        // 这里把位置重建出来
        const { x, y, roomName } = pos
        return { pos: new RoomPosition(x, y, roomName), type }
    })
}

/**
 * 管理建筑工地
 * 将放置挂起队列里的工地
 */
export const manageConstruction = function () {
    planSite()
    handleCompleteSite()
}

/**
 * 放置队列中的工地
 */
const planSite = function () {
    // 没有需要放置的、或者工地已经放满了，直接退出
    if (waitingConstruction.length <= 0) return
    const buildingSiteLength = Object.keys(Game.constructionSites).length
    if (buildingSiteLength >= MAX_CONSTRUCTION_SITES) return

    // 取出本 tick 的最大允许放置数量
    const preparePlaceSites = waitingConstruction.splice(0, MAX_CONSTRUCTION_SITES - buildingSiteLength)
    
    const cantPlaceSites = preparePlaceSites.filter(site => {
        const { pos, type } = site
        const result = pos.createConstructionSite(type)

        if (result === ERR_INVALID_TARGET) {
            // log(`工地 ${type} 重复放置，已放弃，位置 [${pos}]`, ['建造控制器'], 'yellow')
            return false
        }
        // 放置失败，下次重试
        else if (result !== OK && result !== ERR_FULL && result !== ERR_RCL_NOT_ENOUGH) {
            log(`工地 ${type} 无法放置，位置 [${pos}]，createConstructionSite 结果 ${result}`, ['建造控制器'], 'yellow')
            return true
        }

        return false
    })

    // 把放置失败的工地放到队首下次再次尝试放置
    if (cantPlaceSites.length > 0) waitingConstruction.unshift(...cantPlaceSites)
    Game._needSaveConstructionData = true
}

/**
 * 找到建造完成的工地并触发对应的回调
 */
const handleCompleteSite = function () {
    try {
        const lastSiteIds = Object.keys(lastGameConstruction)
        const nowSiteIds = Object.keys(Game.constructionSites)
        // 工地数量不一致了，说明有工地被踩掉或者造好了
        if (lastSiteIds.length !== nowSiteIds.length) {
            const disappearedSiteIds = lastSiteIds.filter(id => !(id in Game.constructionSites))

            disappearedSiteIds.map(siteId => {
                const lastSite = lastGameConstruction[siteId]
                const structure = getSiteStructure(lastSite)

                // 建造完成
                if (structure) {
                    updateStructure(structure.room.name, structure.structureType, structure.id)
                    // 如果有的话就执行回调
                    if (structure.onBuildComplete) structure.onBuildComplete()
                    buildCompleteSite[siteId] = structure
                }
                // 建造失败，回存到等待队列
                else {
                    waitingConstruction.push({ pos: lastSite.pos, type: lastSite.structureType })
                    Game._needSaveConstructionData = true
                }
            })
        }
    }
    catch (e) {
        throw e
    }
    finally {
        // 更新缓存
        lastGameConstruction = Game.constructionSites
    }
}

/**
 * 向队列里新增建造任务
 */
export const addConstructionSite = function (sites: ConstructionPos[]) {
    waitingConstruction.push(...sites)
    Game._needSaveConstructionData = true
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

        if (matchedSite.length === 1) return matchedSite[0]
        return pos.findClosestByPath(matchedSite)
    }

    // 没有优先建造的工地，直接找最近的
    return pos.findClosestByPath(sites)
}

/**
 * 检查一个建筑工地是否建造完成
 * 
 * @param site 建筑工地
 * @returns 若建造完成则返回对应的建筑
 */
export const getSiteStructure = function (site: ConstructionSite): Structure {
    // 检查上面是否有已经造好的同类型建筑
    return site.pos.lookFor(LOOK_STRUCTURES).find(({ structureType }) => {
        return structureType === site.structureType
    })
}

/**
 * 建造管理模块注册插件
 */
export const constructionAppPlugin: AppLifecycleCallbacks = {
    reset: initConstructionController,
    afterWork: manageConstruction,
    tickEnd: saveWaiting
}