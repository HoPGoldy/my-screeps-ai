import { collectCost } from '@/modulesGlobal/framework'
import { SHOW_CPU_COST_TYPE } from '@/mount/global/common'
import { runStrategyCore } from './strategy/strategyCore'

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
    collectCost(`${room.name} remote`, TYPE_ROOM, room.remote.run)
    collectCost(`${room.name} storage`, TYPE_ROOM, room.storageController.run)
    collectCost(`${room.name} terminal`, TYPE_ROOM, room.terminalController.run)
    collectCost(`${room.name} link`, TYPE_ROOM, room.linkController.run)
    collectCost(`${room.name} lab`, TYPE_ROOM, room.labController.run)
    collectCost(`${room.name} factory`, TYPE_ROOM, room.factoryController.run)
    collectCost(`${room.name} observer`, TYPE_ROOM, room.observerController.run)
    collectCost(`${room.name} nuker`, TYPE_ROOM, room.nukerController.run)
    collectCost(`${room.name} powerSpawn`, TYPE_ROOM, room.psController.run)
}

/**
 * 危险操作：执行本 api 将会直接将房间彻底移除
 */
export const dangerousRemove = function (room: Room): string {
    // 移除建筑
    room.find(FIND_STRUCTURES).forEach(s => {
        if (
            s.structureType === STRUCTURE_STORAGE ||
            s.structureType === STRUCTURE_TERMINAL ||
            s.structureType === STRUCTURE_WALL ||
            s.structureType === STRUCTURE_RAMPART
        ) return

        s.destroy()
    })

    // 移除内存
    delete room.memory
    delete Memory.stats.rooms[room.name]

    // 移除 creep
    room.find(FIND_MY_CREEPS).forEach(creep => creep.suicide())

    // 放弃房间
    room.controller.unclaim()

    return room.name + ' 房间已移除'
}

declare global {
    /**
     * 房间内存
     */
    interface RoomMemory {
        /**
         * 该房间发起移除操作的时间
         * 执行移除时会检查该时间，如果已经过期的话将不会执行移除操作
         */
        removeTime?: number
        /**
         * 基地中心点坐标, [0] 为 x 坐标, [1] 为 y 坐标
         */
        center: [number, number]
        /**
         * 是否关闭自动布局，该值为 true 时将不会对本房间运行自动布局
         */
        noLayout: boolean
    }
}
