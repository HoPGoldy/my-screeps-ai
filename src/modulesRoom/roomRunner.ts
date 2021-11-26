/**
 * 运行房间工作逻辑
 */
export const runRoom = function (room: Room): void {
    if (!room?.controller?.my) return

    room.controller.run()
    room.spawner.run()
    room.myStorage.run()
    room.myTerminal.run()
    room.myLab.runBoost()
    room.myLab.runReaction()
    room.myFactory.run()
    room.myObserver.run()

    room[STRUCTURE_LINK].forEach(link => link.run())
    room[STRUCTURE_TOWER].forEach(tower => tower.run())
    room[STRUCTURE_NUKER]?.run()
    room[STRUCTURE_POWER_SPAWN]?.run()
}