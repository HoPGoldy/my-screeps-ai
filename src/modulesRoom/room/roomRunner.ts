import { collectCost } from '@/modulesGlobal/framework'
import { SHOW_CPU_COST_TYPE } from '@/mount/global/common'
import { runStrategyCore } from './strategyCore'

const { ROOM: TYPE_ROOM } = SHOW_CPU_COST_TYPE

/**
 * 运行房间工作逻辑
 */
export const roomRunner = function (room: Room): void {
    if (!room?.controller?.my) return

    runStrategyCore(room.controller)

    collectCost(`${room.name} spawn`, TYPE_ROOM, room.spawnController.run)
    collectCost(`${room.name} transport`, TYPE_ROOM, room.transport.run)
    collectCost(`${room.name} work`, TYPE_ROOM, room.work.run)
    collectCost(`${room.name} tower`, TYPE_ROOM, room.towerController.run)
    collectCost(`${room.name} storage`, TYPE_ROOM, room.storageController.run)
    collectCost(`${room.name} terminal`, TYPE_ROOM, room.terminalController.run)
    collectCost(`${room.name} link`, TYPE_ROOM, room.linkController.run)
    collectCost(`${room.name} lab`, TYPE_ROOM, room.labController.run)
    collectCost(`${room.name} factory`, TYPE_ROOM, room.factoryController.run)
    collectCost(`${room.name} observer`, TYPE_ROOM, room.observerController.run)
    collectCost(`${room.name} nuker`, TYPE_ROOM, room.nukerController.run)
    collectCost(`${room.name} powerSpawn`, TYPE_ROOM, room.psController.run)
}
