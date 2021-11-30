import { createMemoryAccessor } from './memory'
import { ConstructInfo, ConstructionContext } from './types'

/**
 * 建造的优先级
 * 越靠前建造优先级越高
 */
const BUILD_PRIORITY = [STRUCTURE_SPAWN, STRUCTURE_TOWER, STRUCTURE_EXTENSION, STRUCTURE_LINK]

export const createConstructionController = function (context: ConstructionContext) {
    const { onBuildComplete, getMemory, env } = context
    const db = createMemoryAccessor(getMemory)

    /**
     * 获取一个工地信息对应的建筑
     *
     * @param site 建筑工地
     * @returns 若建造完成则返回对应的建筑
     */
    const getSiteStructure = function ({ x, y, roomName, type }: ConstructInfo): Structure | undefined {
        try {
            const pos = new RoomPosition(x, y, roomName)
            // 检查上面是否有已经造好的同类型建筑
            return pos.lookFor(LOOK_STRUCTURES).find(({ structureType }) => {
                return structureType === type
            })
        }
        catch (e) {
            // 上面代码如果没有视野的话就会报错
        }
    }

    /**
     * 放置正在排队的工地
     */
    const planSite = function () {
        const waitingSites = db.queryWaitingSites()
        const gameSites = env.getGame().constructionSites

        const buildingSiteLength = Object.keys(gameSites).length
        if (buildingSiteLength >= MAX_CONSTRUCTION_SITES) return

        // 取出本 tick 的最大允许放置数量
        const preparePlaceSites = waitingSites.splice(0, MAX_CONSTRUCTION_SITES - buildingSiteLength)

        // 遍历所有工地并尝试放置，最后拿到所有没有放置成功的工地
        const failSiteInfos = preparePlaceSites.filter(({ x, y, roomName, type }) => {
            const sitePos = new RoomPosition(x, y, roomName)
            const result = sitePos.createConstructionSite(type)

            if (result === ERR_INVALID_TARGET) {
                // effects.log(`工地 ${type} 重复放置或放置在了无效的位置 ${sitePos}，已放弃继续放置`, ['建造控制器'], Color.Yellow)
                return false
            }
            // 放置失败，下次重试
            else if (result !== OK && result !== ERR_FULL && result !== ERR_RCL_NOT_ENOUGH) {
                env.log.warning(`工地 ${type} 无法放置，位置 [${sitePos}]，createConstructionSite 结果 ${result}`)
                return true
            }

            return false
        })

        // 把放置失败的工地放到队首下次再次尝试放置
        if (failSiteInfos.length > 0) db.insertWaitingSites(failSiteInfos)
    }

    /**
     * 找到建造完成的工地并触发对应的回调
     */
    const handleCompleteSite = function () {
        const buildingSites = db.queryBuildSites()
        const buildingSiteLength = Object.keys(buildingSites).length
        const existSites = env.getGame().constructionSites
        const existSiteLength = Object.keys(existSites).length

        // 工地数量一致，说明没有刚造好的工地
        if (buildingSiteLength === existSiteLength) return

        // 本模块知道的正在建造的工地少，说明有工地新增进来了，直接全量更新
        if (buildingSiteLength < existSiteLength) {
            const newBuildingSites = Object.entries(existSites).reduce((result, [id, site]) => {
                result[id] = {
                    x: site.pos.x,
                    y: site.pos.y,
                    roomName: site.pos.roomName,
                    type: site.structureType
                }
                return result
            }, {})

            db.updateBuildingSites(newBuildingSites)
            return
        }

        // 现存工地少，有工地建造好了或者被干掉了
        if (buildingSiteLength > existSiteLength) {
            const disappearedSiteIds = Object.keys(buildingSites).filter(id => !(id in existSites))

            const failSiteInfos = disappearedSiteIds.map(id => buildingSites[id]).filter(siteInfo => {
                const structure = getSiteStructure(siteInfo)
                if (structure) onBuildComplete(structure)

                // 这里，没找到建筑会返回 true，说明被干掉了，后面会重新尝试建造
                return !structure
            })

            // 把处理好的工地丢弃，防止下次调用时重复触发
            for (const id of disappearedSiteIds) delete buildingSites[id]
            db.updateBuildingSites(buildingSites)

            // 把放置失败的工地放到队首下次再次尝试放置
            if (failSiteInfos.length > 0) db.insertWaitingSites(failSiteInfos)
        }
    }

    /**
     * 获取最近的待建造工地
     * 使用前请确保该位置有视野
     *
     * @param pos 获取本房间内距离该位置最近且优先级最高的工地
     */
    const getNearSite = function (pos: RoomPosition): ConstructionSite {
        const room = env.getRoomByName(pos.roomName)
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
            env.log.warning(`发现了无法抵达的工地：${targetSites.map(site => site.pos)}，出发位置 ${pos}，工地已移除`)
            return targetSites[0]
        }
        return result
    }

    return { planSite, handleCompleteSite, addConstructionSite: db.insertWaitingSites, getNearSite }
}
