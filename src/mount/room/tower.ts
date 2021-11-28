import { TransportTaskType, WorkTaskType } from '@/modulesRoom'
import { createTowerController } from '@/modulesRoom/tower/controller'
import { whiteListFilter } from '../global/whiteList'
import { GetName } from '@/modulesRoom/spawn/nameGetter'
import { CreepRole } from '@/role/types/role'
import { createEnvContext } from '@/utils'
import { WORK_TASK_PRIOIRY } from '@/modulesRoom/taskWork/constant'
import { TowerMemory } from '@/modulesRoom/tower/types'

declare global {
    interface RoomMemory {
        tower: TowerMemory
    }
}

export const lazyloadTower = function (roomName: string) {
    const env = createEnvContext('tower')
    const getRoom = () => env.getRoomByName(roomName)

    return createTowerController({
        getWorkRoom: getRoom,
        getMemory: () => {
            const { memory } = getRoom()
            if (!memory.tower) memory.tower = {}
            return memory.tower
        },
        getTower: () => getRoom()[STRUCTURE_TOWER],
        getWall: () => getRoom()[STRUCTURE_WALL],
        getRampart: () => getRoom()[STRUCTURE_RAMPART],
        hasFillTowerTask: () => getRoom().transport.hasTaskWithType(TransportTaskType.FillTower),
        addFillTowerTask: () => getRoom().transport.addTask({
            type: TransportTaskType.FillTower,
            priority: 9,
            requests: [{ resType: RESOURCE_ENERGY, to: [STRUCTURE_TOWER], keep: true }]
        }),
        isFriend: whiteListFilter,
        onBackToNormal: () => {
            const room = getRoom()
            room.planLayout()
            room.strategy.operation.useUnitSetting()
        },
        onStartActiveDefense: () => {
            getRoom().strategy.defense.useUnitSetting()
        },
        releaseDefender: boostTaskId => getRoom().spawner.addTask(
            GetName.defender(roomName),
            CreepRole.Defender,
            { boostTaskId }
        ),
        getDefender: () => Game.creeps[GetName.defender(roomName)],
        updateBuildingTask: () => getRoom().work.updateTask({ type: WorkTaskType.Build, priority: WORK_TASK_PRIOIRY.BUILD }, { dispath: true }),
        updateFillWallTask: () => getRoom().work.updateTask({ type: WorkTaskType.FillWall }, { dispath: true }),
        getLab: () => getRoom()[STRUCTURE_LAB],
        addBoostTask: (room, config) => room.myLab.addBoostTask(config),
        getBoostState: (room, taskId) => room.myLab.getBoostState(taskId),
        boostCreep: (room, creep, taskId) => room.myLab.boostCreep(creep, taskId),
        finishBoost: (room, taskId) => room.myLab.finishBoost(taskId),
        env
    })
}
