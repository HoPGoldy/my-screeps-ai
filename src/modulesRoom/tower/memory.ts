import { BuildingSite, DefenseState, TowerMemory } from './types'
import { ConstructInfo } from '@/modulesGlobal/construction/types'
import { BUILD_ADD_NUMBER } from './constants'

export const createMemoryAccessor = (getMemory: () => TowerMemory, roomName: string) => ({
    updateDefenseState (newState: DefenseState) {
        const memory = getMemory()
        if (newState === DefenseState.Daily) delete memory.state
        else memory.state = newState
    },
    queryDefenseState () {
        const memory = getMemory()
        return memory.state ?? DefenseState.Daily
    },
    updateWallSites (newSitePos: ConstructInfo<STRUCTURE_RAMPART | STRUCTURE_WALL>[]) {
        const memory = getMemory()
        const groupedSites = _.groupBy(newSitePos, site => site.type)

        const stringify = ({ x, y }) => `${x},${y}`
        const stringifyWalls = groupedSites[STRUCTURE_WALL]?.map(stringify) || []
        const stringifyRamparts = groupedSites[STRUCTURE_RAMPART]?.map(stringify) || []
        memory.walls = _.uniq([...(memory.walls || []), ...stringifyWalls])
        memory.ramparts = _.uniq([...(memory.ramparts || []), ...stringifyRamparts])
    },
    queryBuilding (): BuildingSite[] {
        const memory = getMemory()

        // 补充完了还是没有，那就说明真没有
        if (!memory.building || memory.building.length <= 0) {
            delete memory.building
            return []
        }

        // 重建并返回正在建造的
        return memory.building.map(siteStr => {
            const [x, y, typeCode] = siteStr.split(',')
            return {
                pos: new RoomPosition(+x, +y, roomName),
                type: +typeCode === 1 ? STRUCTURE_WALL : STRUCTURE_RAMPART
            }
        })
    },
    updateBuilding (newBuilding: BuildingSite[]) {
        const memory = getMemory()
        if (newBuilding.length <= 0) {
            delete memory.building
            return
        }

        memory.building = newBuilding.map(({ pos, type }) => {
            return `${pos.x},${pos.y},${type === STRUCTURE_WALL ? 1 : 2}`
        })
    },
    hasWaitingSite () {
        const memory = getMemory()
        return (memory.ramparts?.length || 0) + (memory.walls?.length || 0) > 0
    },
    updateNukerWall (wallPos: RoomPosition[]) {
        const memory = getMemory()
        if (wallPos.length <= 0) {
            delete memory.nukerWallsPos
            return
        }

        memory.nukerWallsPos = wallPos.map(pos => `${pos.x},${pos.y}`).join('|')
    },
    queryNukerWall () {
        const { nukerWallsPos } = getMemory()
        if (!nukerWallsPos || nukerWallsPos.length <= 0) return []

        return nukerWallsPos.split('|').map(posStr => {
            const [x, y] = posStr.split(',')
            return new RoomPosition(+x, +y, roomName)
        })
    },
    /**
     * 从待建造队列取出建造目标
     */
    withdrawBuilding () {
        const memory = getMemory()

        // 从待建造队列补充
        for (let i = 0; i < BUILD_ADD_NUMBER; i++) {
            const typeCode = memory.walls?.length > 0 ? 1 : 2
            const siteStr = (memory.walls || []).shift() || (memory.ramparts || []).shift()
            if (!siteStr) break

            if (!memory.building) memory.building = []
            memory.building.push(siteStr + ',' + typeCode)
        }
    },
    deleteBuilding () {
        const memory = getMemory()
        delete memory.building
    },
    deleteFocusWall () {
        const memory = getMemory()
        delete memory.focusTimeout
        delete memory.focusWallId
    }
})

export type TowerMemoryAccessor = ReturnType<typeof createMemoryAccessor>
