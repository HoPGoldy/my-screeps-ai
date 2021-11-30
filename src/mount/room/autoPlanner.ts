import { createAutoPlanner } from '@/modulesGlobal/autoPlanning'
import { addConstructionSite } from '@/modulesGlobal/construction'
import { ConstructInfo } from '@/modulesGlobal/construction/types'
import { addBuildTask } from '@/modulesRoom/taskWork/delayTask'
import { getTowerController } from './tower'

export const autoPlanner = createAutoPlanner({
    placeSite: (room, planResult) => {
        const wallPosList: ConstructInfo<STRUCTURE_WALL | STRUCTURE_RAMPART>[] = []
        // 遍历布局中所有建筑类型
        const sitePosList: ConstructInfo[] = [].concat(...Object.keys(planResult).map((structureType: BuildableStructureConstant) => {
            if (structureType === STRUCTURE_WALL || structureType === STRUCTURE_RAMPART) {
                const wallInfos = planResult[structureType].map(({ x, y, roomName }) => {
                    return { x, y, roomName, type: structureType }
                })
                wallPosList.push(...wallInfos)

                return []
            }
            // 如果是关键建筑，就执行检查：如果建筑里没有能量（就没有利用价值）了，直接摧毁
            if (structureType === STRUCTURE_STORAGE || structureType === STRUCTURE_TERMINAL || structureType === STRUCTURE_FACTORY) {
                const structure = room[structureType]
                const isNotMy = structure && !structure.my
                if (
                    // 如果是工厂的话直接摧毁，因为就算里边有能量 creep 也不会用
                    (structureType === STRUCTURE_FACTORY && isNotMy) ||
                    // storage 和 terminal 要看里边有没有能量
                    (isNotMy && structure.store[RESOURCE_ENERGY] <= 100)
                ) structure.destroy()
            }

            // 遍历该建筑下的所有预放置点位
            return planResult[structureType].map(({ x, y, roomName }) => {
                return { x, y, roomName, type: structureType }
            })
        }))

        // 放置工地并发布建造任务
        addConstructionSite(sitePosList)
        addBuildTask(room.name)
        // 有墙壁的话就转交给房间防御模块负责建造
        if (wallPosList.length > 0) getTowerController(room.name).addNewWall(wallPosList)
    }
})
