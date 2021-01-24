import mountCreep from './creep'
import mountPowerCreep from './powerCreep'
import mountRoom from './room'
import mountRoomPostion from './roomPosition'
import mountGlobal from './global'
import mountStructure from './structures'
import mountSource from './source'
import { log } from 'utils'
import { initConstructionController } from 'modules/constructionController'

/**
 * 挂载所有的属性和方法
 */
export default function (): void {
    log('重新挂载拓展', ['global'], 'green')

    // 存储的兜底工作
    initStorage()

    // 挂载全部拓展
    mountGlobal()
    mountRoom()
    mountRoomPostion()
    mountCreep()
    mountPowerCreep()
    mountStructure()
    mountSource()
    
    // 检查是不是刚刚放下第一个 spawn
    checkFirstRun()

    workAfterMount()
}

/**
 * 初始化存储
 */
function initStorage() {
    if (!Memory.rooms) Memory.rooms = {}
    else delete Memory.rooms.undefined

    if (!Memory.stats) Memory.stats = { rooms: {} }
    if (!Memory.delayTasks) Memory.delayTasks = []
    if (!Memory.creepConfigs) Memory.creepConfigs = {}
    if (!Memory.resourceSourceMap) Memory.resourceSourceMap = {}
}

// 挂载完成后要执行的一些作业
function workAfterMount() {
    // 把已经孵化的 pc 能力注册到其所在的房间上，方便房间内其他 RoomObject 查询并决定是否发布 power 任务
    Object.values(Game.powerCreeps).forEach(pc => {
        if (!pc.room) return
        pc.updatePowerToRoom()
    })

    initConstructionController()
}

/**
 * 如果是第一次运行的话就触发回调
 */
const checkFirstRun = function () {
    if (Memory.botTag) return

    const spawns = Object.values(Game.spawns)
    if (spawns.length > 1) return

    // 立刻规划
    log('欢迎来到 Screeps 的世界!\n', ['hopgoldy bot'], 'green')
    spawns[0].room.controller.onLevelChange(1)
    // spawns[0].room.controller.stateScanner()
    Memory.botTag = 'hopgoldy'
}