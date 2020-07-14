import mountCreep from './mount.creep'
import mountPowerCreep from './mount.powerCreep'
import mountRoom from './mount.room'
import mountGlobal from './mount.global'
import mountStructure from './mount.structure'
import { planLayout } from './autoPlanning'

/**
 * 挂载所有的额外属性和方法
 */
export default function (): void {
    if (!global.hasExtension) {
        console.log('[mount] 重新挂载拓展')

        // 存储的兜底工作
        initStorage()
        
        // 挂载全部拓展
        mountGlobal()
        mountRoom()
        mountCreep()
        mountPowerCreep()
        mountStructure()

        global.hasExtension = true

        workAfterMount()
    }
}

/**
 * 初始化存储
 */
function initStorage() {
    if (!Memory.rooms) Memory.rooms = {}
    if (!Memory.stats) Memory.stats = { rooms: {} }
    if (!global.routeCache) global.routeCache = {}
    if (!global.resourcePrice) global.resourcePrice = {}
}

// 挂载完成后要执行的一些作业
function workAfterMount() {
    // 对所有的房间执行建筑规划，放置有房间缺失建筑
    Object.values(Game.rooms).forEach(room => {
        if (!room.controller || !room.controller.my) return
        planLayout(room)
    })
}