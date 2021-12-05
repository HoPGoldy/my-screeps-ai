import { TransportTaskType } from '@/modulesRoom'
import { createTowerController } from '@/modulesRoom/tower/controller'
import { whiteListFilter } from '../global/whiteList'
import { GetName } from '@/modulesRoom/spawn/nameGetter'
import { CreepRole } from '@/role/types/role'
import { createCache, createEnvContext } from '@/utils'
import { TowerMemory } from '@/modulesRoom/tower/types'
import { addBuildTask } from '@/modulesRoom/taskWork/delayTask'

declare global {
    interface RoomMemory {
        tower: TowerMemory
    }
}

const lazyloadTower = createTowerController({
    getMemory: room => {
        if (!room.memory.tower) room.memory.tower = {}
        return room.memory.tower
    },
    getTower: room => room[STRUCTURE_TOWER],
    getWall: room => room[STRUCTURE_WALL],
    getRampart: room => room[STRUCTURE_RAMPART],
    hasFillTowerTask: room => room.transport.hasTaskWithType(TransportTaskType.FillTower),
    addFillTowerTask: room => room.transport.addTask({
        type: TransportTaskType.FillTower,
        priority: 9,
        requests: [{ resType: RESOURCE_ENERGY, to: [STRUCTURE_TOWER], keep: true }]
    }),
    isFriend: whiteListFilter,
    onBackToNormal: room => {
        room.planLayout()
        room.strategy.operation.useUnitSetting()
    },
    onStartActiveDefense: room => {
        room.strategy.defense.useUnitSetting()
    },
    releaseDefender: (room, boostTaskId) => room.spawner.addTask(
        GetName.defender(room.name),
        CreepRole.Defender,
        { boostTaskId }
    ),
    getDefender: room => Game.creeps[GetName.defender(room.name)],
    updateBuildingTask: room => addBuildTask(room.name, 1),
    getLab: room => room[STRUCTURE_LAB],
    addBoostTask: (room, config) => room.myLab.addBoostTask(config),
    getBoostState: (room, taskId) => room.myLab.getBoostState(taskId),
    boostCreep: (room, creep, taskId) => room.myLab.boostCreep(creep, taskId),
    finishBoost: (room, taskId) => room.myLab.finishBoost(taskId),
    env: createEnvContext('tower')
})

export const [getTowerController] = createCache(lazyloadTower)
