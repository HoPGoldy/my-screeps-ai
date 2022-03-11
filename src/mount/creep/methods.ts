import { goTo } from '@/modulesGlobal/move'
import { getNearSite } from '@/mount/global/construction'

/**
 * 建设房间内存在的建筑工地
 */
export const buildRoom = function (creep: Creep, roomName: string): CreepActionReturnCode | ERR_NOT_ENOUGH_RESOURCES | ERR_RCL_NOT_ENOUGH | ERR_NOT_FOUND {
    const inWorkRoom = creep.room.name === roomName
    const roomPos = inWorkRoom ? creep.pos : new RoomPosition(25, 25, roomName)
    // 搜索目标工地
    const target = getNearSite(roomPos)

    // 找不到目标就判断下，如果不在房间内就走过去，在房间内还没有目标才是真没目标
    if (!target) {
        if (!inWorkRoom) {
            goTo(creep, roomPos, { range: 3 })
            return OK
        }
        return ERR_NOT_FOUND
    }
    // 上面发现有墙要刷了，这个 tick 就不再造建造了
    // 防止出现造好一个 rampart，然后直接造下一个 rampart，造好后又扭头去刷第一个 rampart 的小问题出现
    if (creep.memory.fillWallId) return ERR_BUSY

    // 建设
    const buildResult = creep.build(target)

    if (buildResult === ERR_NOT_IN_RANGE) goTo(creep, target.pos, { range: 3 })
    return buildResult
}
