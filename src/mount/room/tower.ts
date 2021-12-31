import { TransportTaskType } from '@/modulesRoom'
import { createTowerController } from '@/modulesRoom/tower/controller'
import { whiteListFilter } from '../global/whiteList'
import { GetName } from '@/modulesRoom/spawn/nameGetter'
import { CreepRole } from '@/role/types/role'
import { createEnvContext } from '@/utils'
import { TowerMemory } from '@/modulesRoom/tower/types'
import { addBuildTask } from '@/modulesRoom/taskWork/delayTask'
import { getTower, getWall, getRampart, getLab } from './shortcut'
import { useUnitSetting } from '@/modulesRoom/room/strategyOperation'
import { useDefenseUnitSetting } from '@/modulesRoom/room/strategyDefense'

declare global {
    interface RoomMemory {
        tower: TowerMemory
    }
}

export const getTowerController = createTowerController({
    getMemory: room => {
        if (!room.memory.tower) room.memory.tower = {}
        return room.memory.tower
    },
    getTower,
    getWall,
    getRampart,
    hasFillTowerTask: room => room.transport.hasTaskWithType(TransportTaskType.FillTower),
    addFillTowerTask: room => room.transport.addTask({
        type: TransportTaskType.FillTower,
        priority: 9,
        requests: [{ resType: RESOURCE_ENERGY, to: [STRUCTURE_TOWER], keep: true }]
    }),
    isFriend: whiteListFilter,
    onBackToNormal: room => {
        room.planLayout()
        useUnitSetting(room)
    },
    onStartActiveDefense: useDefenseUnitSetting,
    releaseDefender: (room, boostTaskId) => room.spawner.addTask(
        GetName.defender(room.name),
        CreepRole.Defender,
        { boostTaskId }
    ),
    getDefender: room => Game.creeps[GetName.defender(room.name)],
    updateBuildingTask: room => addBuildTask(room.name, 1),
    getLab,
    addBoostTask: (room, config) => room.labController.addBoostTask(config),
    getBoostState: (room, taskId) => room.labController.getBoostState(taskId),
    boostCreep: (room, creep, taskId) => room.labController.boostCreep(creep, taskId),
    finishBoost: (room, taskId) => room.labController.finishBoost(taskId),
    env: createEnvContext('tower')
})
