import { Color } from '../console'
import { ConstructInfo, CreateOptions } from './types'

export const createConstructionManager = function (effects: CreateOptions) {
    /**
     * 向队列里新增建造任务
     */
     const addConstructionSite = function (sites: ConstructInfo[]) {
        const waitingSites = effects.getWaitingSites()
        effects.setWaitingSites([...waitingSites, ...sites])
    }

    /**
     * 检查一个建筑工地是否建造完成
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
            return
        }
    }

    /**
     * 放置正在排队的工地
     */
    const planSite = function () {
        const waitingSites = effects.getWaitingSites()
        const gameSites = effects.getGameSites()

        const buildingSiteLength = Object.keys(gameSites).length
        if (buildingSiteLength >= MAX_CONSTRUCTION_SITES) return

        // 取出本 tick 的最大允许放置数量
        const preparePlaceSites = waitingSites.splice(0, MAX_CONSTRUCTION_SITES - buildingSiteLength)

        // 遍历所有工地并尝试放置，最后拿到所有没有放置成功的工地
        const failSiteInfos = preparePlaceSites.filter(({ x, y, roomName, type }) => {
            const sitePos = new RoomPosition(x, y, roomName)
            const result = sitePos.createConstructionSite(type)

            if (result === ERR_INVALID_TARGET) {
                effects.log(`工地 ${type} 重复放置或放置在了无效的位置 [${sitePos}]，已放弃继续放置`, ['建造控制器'], Color.Yellow)
                return false
            }
            // 放置失败，下次重试
            else if (result !== OK && result !== ERR_FULL && result !== ERR_RCL_NOT_ENOUGH) {
                effects.log(`工地 ${type} 无法放置，位置 [${sitePos}]，createConstructionSite 结果 ${result}`, ['建造控制器'], Color.Yellow)
                return true
            }

            return false
        })

        // 把放置失败的工地放到队首下次再次尝试放置
        if (failSiteInfos.length > 0) addConstructionSite(failSiteInfos)
    }

    /**
     * 找到建造完成的工地并触发对应的回调
     */
    const handleCompleteSite = function () {
        const buildingSites = effects.getBuildSites()
        const buildingSiteLength = Object.keys(buildingSites).length
        const existSites = effects.getGameSites()
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

            effects.setBuildingSites(newBuildingSites)
            return
        }

        // 现存工地少，有工地建造好了或者被干掉了
        if (buildingSiteLength > existSiteLength) {
            const disappearedSiteIds = Object.keys(buildingSites).filter(id => !(id in existSites))

            const failSiteInfos = disappearedSiteIds.map(id => buildingSites[id]).filter(siteInfo => {
                const structure = getSiteStructure(siteInfo)

                // 没找到对应位置上有建筑，那应该是被干掉了，重新尝试建造
                if (!structure) return true

                effects.updateStructure(structure.room.name, structure.structureType, structure.id)
                // 如果有的话就执行回调
                if (structure.onBuildComplete) structure.onBuildComplete()
            })

            // 把处理好的工地丢弃，防止下次调用时重复触发
            for (const id of disappearedSiteIds) delete buildingSites[id]
            effects.setBuildingSites(buildingSites)

            // 把放置失败的工地放到队首下次再次尝试放置
            if (failSiteInfos.length > 0) addConstructionSite(failSiteInfos)
        }
    }

    return { planSite, handleCompleteSite, addConstructionSite }
}
