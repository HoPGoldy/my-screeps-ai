import { contextOutside } from '../context'
import { RunMobilizeStateFunc } from './types'

/**
 * 强化执行阶段
 * 注意：执行这个阶段时有可能存在 creep 还没有孵化完成
 * 因为那边的前置判断比较多，放在这边等孵化结束比较省 cpu
 */
export const runBoosting: RunMobilizeStateFunc = function ({ task, room, finishTask }, env) {
    // console.log('正在执行 Boosting')
    const { finishBoost, boostCreep } = contextOutside.use()

    if (!task.data.members) {
        env.log.error(`动员任务 ${task.squadCode} 找不到小队成员名称，任务中断`)
        return
    }
    const members = task.data.members.map(env.getCreepByName)
    const allAlive = members.every(Boolean)

    if (!allAlive) {
        env.log.error(`动员任务 ${task.squadCode} 找不到指定的成员，任务中断`)
        return
    }

    const hasSpawning = !!members.find(creep => creep.spawning)
    if (hasSpawning) return

    // 不需要 boost，直接完成动员任务
    if (!task.needBoost) return finishTask(members)

    if (task.data.boostNote) {
        // 都完成强化了就完成动员任务
        const allBoost = Object.values(task.data.boostNote).every(Boolean)
        if (allBoost) {
            finishBoost(room, task.data.boostTaskId)
            return finishTask(members)
        }
    }
    else {
        task.data.boostNote = {}
        members.forEach(creep => {
            task.data.boostNote[creep.name] = false
        })
    }

    // 没有完成 boost 的单位继续执行 boost
    const unfinishBoostMembers = members.filter(creep => !task.data.boostNote[creep.name])
    unfinishBoostMembers.forEach(creep => {
        task.data.boostNote[creep.name] = boostCreep(room, creep, task.data.boostTaskId)
    })
}
