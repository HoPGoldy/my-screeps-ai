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

    collectCost(`${room.name} spawn`, TYPE_ROOM, () => room.spawner.run())
    collectCost(`${room.name} storage`, TYPE_ROOM, room.storageController.run)
    collectCost(`${room.name} terminal`, TYPE_ROOM, room.terminalController.run)
    collectCost(`${room.name} lab boost`, TYPE_ROOM, () => room.myLab.runBoost())
    collectCost(`${room.name} lab reaction`, TYPE_ROOM, () => room.myLab.runReaction())
    collectCost(`${room.name} factory`, TYPE_ROOM, () => room.myFactory.run())
    collectCost(`${room.name} observer`, TYPE_ROOM, () => room.myObserver.run())
    collectCost(`${room.name} tower`, TYPE_ROOM, room.towerController.run)
    collectCost(`${room.name} link`, TYPE_ROOM, room.linkController.run)
    collectCost(`${room.name} nuker`, TYPE_ROOM, room.nukerController.run)
    collectCost(`${room.name} powerSpawn`, TYPE_ROOM, room.psController.run)
}
