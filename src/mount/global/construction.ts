
import { ConstructionMemory, createConstructionController } from '@/modulesGlobal/construction'
import { AppLifecycleCallbacks } from '@/modulesGlobal/framework/types'
import { createEnvContext } from '@/utils'
import { WorkTaskType } from '@/modulesRoom/taskWork/types'
import { CreepRole } from '@/role/types/role'
import { getExtractor, updateStructure } from '../room/shortcut'
import { sourceUtils } from './source'
import { changeForStartContainer } from '@/modulesRoom/room/strategyOperation'

/**
* 当墙壁建造好后将找到最近的工人刷一下自己
*/
const onWallBuildComplete = function (wall: StructureWall | StructureRampart) {
    const filler = wall.pos.findInRange(FIND_MY_CREEPS, 5).find(creep => {
        return creep.memory.role === CreepRole.Worker && !creep.memory.fillWallId
    })
    if (filler) filler.memory.fillWallId = wall.id

    // 同时发布刷墙任务
    wall.room.work.updateTask({ type: WorkTaskType.FillWall, need: 1 })
    // 移除墙壁缓存，让刷墙单位可以快速发现新 rempart
    wall.room.towerController.clearFocus()
}

/**
 * 不同的建筑在建筑完成后要执行的回调
 */
const buildCallback: {
    [strType in BuildableStructureConstant]?: (str: AnyStructure) => unknown
} = {
    /**
     * 目前只有 source container，所以会在建造完成后把自己注册到对应 source 并发布对应任务
     */
    [STRUCTURE_CONTAINER]: (container: StructureContainer) => {
        // 找到身边第一个没有设置 container 的 source
        const nearSource = container.pos.findInRange(FIND_SOURCES, 1, {
            filter: source => !sourceUtils.getContainer(source)
        })
        if (nearSource[0]) sourceUtils.setContainer(nearSource[0], container)

        // 外矿的 containre 不会进行运营策略变更
        if (container.room.controller.level < 1) return false
        changeForStartContainer(container.room)
    },
    /**
     * 采集器造好后如果终端造好了就孵化采集单位
     */
    [STRUCTURE_EXTRACTOR]: (extractor: StructureExtractor) => {
        if (extractor.room.terminal) extractor.room.harvest.startHarvestMineral()
    },
    /**
     * link 造好后默认分配职责
     * 也可以手动调用 StructureLink.as... 方法重新分配职责
     */
    [STRUCTURE_LINK]: (link: StructureLink) => {
        // 如果附近有 controller 就转换为 UpgradeLink
        if (link.room.controller.pos.inRangeTo(link, 2)) {
            link.room.linkController.asUpgrade(link)
            return
        }

        // 在基地中心附近就转换为 CenterLink
        const center = link.room.memory.center
        if (center && link.pos.isNearTo(new RoomPosition(center[0], center[1], link.room.name))) {
            link.room.linkController.asCenter(link)
            return
        }

        // 否则就默认转换为 SourceLink（因为有外矿 link，而这种 link 边上是没有 source 的）
        link.room.linkController.asSource(link)
    },
    [STRUCTURE_TERMINAL]: (terminal: StructureTerminal) => {
        // 有 extractor 了，发布矿工并添加对应的共享协议
        if (getExtractor(terminal.room)) {
            terminal.room.harvest.startHarvestMineral()
        }
        terminal.room.terminalController.resetConfig()
    },
    [STRUCTURE_WALL]: onWallBuildComplete,
    [STRUCTURE_RAMPART]: onWallBuildComplete
}

// 构建建筑管理模块
const { addConstructionSite, planSite, handleCompleteSite, getNearSite, mountConstruct } = createConstructionController({
    getMemory: () => {
        if (!Memory.sites) Memory.sites = {}
        return Memory.sites
    },
    onBuildComplete: structure => {
        const { room, id, structureType } = structure
        updateStructure(room, structureType as BuildableStructureConstant, id)
        if (structureType in buildCallback) buildCallback[structureType](structure)
    },
    env: createEnvContext('建筑管理')
})

declare global {
    interface Memory {
        sites?: ConstructionMemory
    }
}

/**
 * 建造管理模块注册插件
 */
export const constructionAppPlugin: AppLifecycleCallbacks = {
    tickStart: handleCompleteSite,
    tickEnd: planSite
}

export { addConstructionSite, getNearSite, mountConstruct }
