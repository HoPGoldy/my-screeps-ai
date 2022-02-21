import { TransportTaskType } from '@/modulesRoom'
import { createTowerController } from '@/modulesRoom/tower/controller'
import { whiteListFilter } from '../global/whiteList'
import { createEnvContext } from '@/utils'
import { TowerMemory } from '@/modulesRoom/tower/types'
import { getTower, getWall, getRampart, getLab } from './shortcut'
import { useUnitSetting } from '@/mount/room/strategy/strategyOperation'
import { useDefenseUnitSetting } from '@/mount/room/strategy/strategyDefense'
import { addSpawnCallback } from './spawn'
import { planRoomLayout } from './autoPlanner'

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
        planRoomLayout(room)
        useUnitSetting(room)
    },
    onStartActiveDefense: useDefenseUnitSetting,
    updateBuildingTask: room => room.work.addBuildTask(1),
    getLab,
    addSpawnTask: (room, ...args) => room.spawnController.addTask(...args),
    addSpawnCallback,
    addBoostTask: (room, config) => room.labController.addBoostTask(config),
    getBoostState: (room, taskId) => room.labController.getBoostState(taskId),
    boostCreep: (room, creep, taskId) => room.labController.boostCreep(creep, taskId),
    finishBoost: (room, taskId) => room.labController.finishBoost(taskId),
    reloadBoostTask: (room, taskId) => room.labController.reloadBoostTask(taskId),
    env: createEnvContext('tower')
})
