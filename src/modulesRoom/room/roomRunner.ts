import { runStrategyCore } from './strategyCore'

/**
 * 运行房间工作逻辑
 */
export const runRoom = function (room: Room): void {
    if (!room?.controller?.my) return

    runStrategyCore(room.controller)

    room.spawner.run()
    room.storageController.run()
    room.terminalController.run()
    room.myLab.runBoost()
    room.myLab.runReaction()
    room.myFactory.run()
    room.myObserver.run()
    room.towerController.run()
    room.linkController.run()
    room.nukerController.run()
    room.psController.run()
}
