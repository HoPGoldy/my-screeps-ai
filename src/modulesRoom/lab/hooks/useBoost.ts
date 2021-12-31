import { BoostResourceConfig } from '@/utils'
import { LabTransportType } from '../constants'
import { LabAccessor } from '../labAccessor'
import { LabMemoryAccessor } from '../memory'
import { BoostState, BoostTask, LabContext, LabState, LabType } from '../types'

export const useBoost = function (roomName: string, context: LabContext, db: LabMemoryAccessor, labAccessor: LabAccessor) {
    const { env, goTo, getLab, getMemory, hasTransportTask, addTransportTask } = context
    const { getInLabs, getReactionLabs, initLabInfo, changeLabType } = labAccessor

    /**
     * 执行强化工作
     */
    const runBoostWork = function () {
        const room = env.getRoomByName(roomName)
        const memory = getMemory(room)

        if (env.inInterval(10)) return
        if (memory.boostTasks.length <= 0) return
        const task = memory.boostTasks[0]

        switch (task.state) {
        case BoostState.GetLab:
            boostGetLab(task, room)
            break
        case BoostState.GetResource:
            boostGetResource(task, room)
            break
        case BoostState.GetEnergy:
            boostGetEnergy(task, room)
            break
        case BoostState.WaitBoost:
            // 感受宁静
            break
        case BoostState.ClearResource:
            boostClear(task, room)
            break
        default:
            boostGetLab(task, room)
        }
    }

    /**
     * 新增强化任务
     *
     * @param resConfig 该任务的强化材料配置
     * @return 该任务的唯一 id
     */
    const addBoostTask = function (resConfig: BoostResourceConfig[]): number | undefined {
        const room = env.getRoomByName(roomName)

        // 强化任务需要的 lab 大于当前房间里的 lab 数量，无法完成强化
        if (resConfig.length > getLab(room).length) return

        const newTask = db.insertBoostTask(resConfig)
        // 执行一次 lab 分配，如果分配失败的话后面还会定期执行分配
        boostGetLab(newTask, room)

        return newTask.id
    }

    /**
     * boost 阶段：获取强化 lab
     * 进入这个阶段是因为有 lab 正在执行反应，需要等待其净空
     */
    const boostGetLab = function (task: BoostTask, room: Room): void {
        // 检查是否已经有正在执行的移出任务
        if (hasTransportTask(room, LabTransportType.LabOut)) return

        // 需要分配给 boost 的 lab 数组
        const boostUseLabs: StructureLab[] = []

        const reactionLabs = getReactionLabs()
        const inLabs = getInLabs()

        // 反应 lab 数量足够，直接使用
        if (reactionLabs.length >= task.res.length) {
            boostUseLabs.push(...reactionLabs)
        }
        // 反应 lab 数量不足了，加上 in lab 试试
        else if (reactionLabs.length + inLabs.length >= task.res.length) {
            // 数量足够的话就直接把整个反应程序停了，inLab 都去 boost 了还合成个啥
            boostUseLabs.push(...reactionLabs, ...inLabs)
            const memory = getMemory(room)
            memory.reactionState = LabState.PutResource
            delete memory.reactionAmount
        }
        // lab 加起来也不够用，放弃任务
        // 注意，这里不会因为可用的 lab（lab 总数大于任务所需数量，但是有些 lab 被其他任务占用）不足就放弃任务，因为只要 lab 总数足够，总有一天任务会安排上
        else if (task.res.length > getLab(room).length) {
            env.log.warning(
                `强化任务 ${task} 需要 lab ${task.res.length} 个，但是目前 lab 只有` +
                `${reactionLabs.length + inLabs.length} 个，任务已放弃`
            )
            db.deleteBoostTask(task.id)
            initLabInfo()
            return
        }

        // 找到需要清空的 lab
        const needCleanLabs = boostUseLabs.filter(lab => lab.mineralType)
        if (needCleanLabs.length > 0) {
            const requests = needCleanLabs.map(lab => ({
                from: lab.id,
                resType: lab.mineralType,
                amount: lab.store[lab.mineralType]
            }))
            addTransportTask(room, LabTransportType.LabOut, requests)
        }
        // 所有 lab 已经清空完毕，进入下个阶段
        else if (boostUseLabs.length > task.res.length) {
            // 将 lab 分配到 boost 任务上
            for (const boostRes of task.res) {
                const lab = boostUseLabs.shift()
                boostRes.lab = lab.id
                changeLabType(lab.id, LabType.Boost)
                boostUseLabs.push(lab)
            }
            // console.log('lab 清理完成！', task.id)
            task.state = BoostState.GetResource
        }
    }

    /**
     * boost 阶段：获取强化材料
     */
    const boostGetResource = function (task: BoostTask, room: Room): void {
        if (hasTransportTask(room, LabTransportType.LabIn)) return

        // 遍历检查资源是否到位
        const allResourceReady = task.res.every(res => {
            const lab = env.getObjectById(res.lab)
            // 有 lab 被摧毁了，任务失败
            if (!lab) {
                task.state = BoostState.ClearResource
                return false
            }

            return lab.store[res.resource] >= res.amount
        })

        // 都就位了就进入下一个阶段
        if (allResourceReady) {
            task.state = BoostState.GetEnergy
        }
        // 否则就发布资源移入任务
        else {
            // console.log('添加 labin 任务', task.id)
            const requests = task.res.map(res => ({
                to: res.lab,
                resType: res.resource,
                amount: res.amount
            }))
            addTransportTask(room, LabTransportType.LabIn, requests)
        }
    }

    /**
     * boost 阶段：获取能量
     */
    const boostGetEnergy = function (task: BoostTask, room: Room): void {
        if (hasTransportTask(room, LabTransportType.LabGetEnergy)) return

        const needFillLabs = task.res
            .map(res => Game.getObjectById(res.lab))
            .filter(lab => lab.store[RESOURCE_ENERGY] < 1000)

        if (needFillLabs.length > 0) {
            env.log.normal('正在填充 boost 能量')
            const requests = needFillLabs.map(lab => ({
                to: lab.id,
                resType: RESOURCE_ENERGY
            }))
            addTransportTask(room, LabTransportType.LabGetEnergy, requests)
        }
        else {
            // 能循环完说明能量都填好了
            task.state = BoostState.WaitBoost
            env.log.success('boost 任务准备就绪，正在等待强化')
        }
    }

    /**
     * boost 阶段：回收材料
     * 将强化用剩下的材料从 lab 中转移到 terminal 中
     */
    const boostClear = function (task: BoostTask, room: Room): void {
        if (hasTransportTask(room, LabTransportType.LabOut)) return

        const needCleanLabs = task.res
            .map(res => Game.getObjectById(res.lab))
            .filter(lab => lab.mineralType)

        // 没有全部净空，添加回收任务
        if (needCleanLabs.length > 0) {
            const requests = needCleanLabs.map(lab => ({
                from: lab.id,
                resType: lab.mineralType
            }))
            addTransportTask(room, LabTransportType.LabOut, requests)
            return
        }

        db.deleteBoostTask(task.id)
        initLabInfo()
        env.log.success('强化任务已完成')
    }

    /**
     * 强化指定 creep
     * @param creep 要强化的 creep
     * @param boostTaskId 要执行的强化任务
     * @returns 强化是否完成（因出现问题导致无法正常完成强化也会返回 true，比如任务里有 HEAL 强化，但是 creep 没有 HEAL 身体）
     */
    const boostCreep = function (creep: Creep, taskId: number): boolean {
        const task = db.queryBoostTaskById(taskId)
        if (!task) return true

        // 拿到 creep 的强化进度
        const boostingNote = db.queryCreepBoostingNote(creep.name, task)

        // 掏出来清单上还没强化过的 lab，挨个执行强化
        boostingNote.filter(({ boosted }) => !boosted).forEach((notBoostLab, index) => {
            const lab = env.getObjectById(notBoostLab.labId)
            if (!lab || !lab.mineralType) {
                notBoostLab.boosted = true
                return
            }

            const boostResult = lab.boostCreep(creep)
            if (boostResult === OK || boostResult === ERR_NOT_FOUND) notBoostLab.boosted = true
            // 一直朝第一个没执行强化的 lab 走
            if (index === 0) goTo(creep, lab.pos)
        })

        const allBoost = boostingNote.every(({ boosted }) => boosted)
        // 如果都强化了就说明 boost 成功了，清除临时存储
        if (allBoost) db.deleteCreepBoostingNote(creep.name)
        return allBoost
    }

    /**
     * 重新装填某个 boost 任务的资源
     * @param taskId 要重新装填的 boost 任务
     */
    const reloadBoostTask = function (taskId: number): ERR_NOT_FOUND | OK {
        const room = env.getRoomByName(roomName)
        const boostTask = db.queryBoostTaskById(taskId)
        if (!boostTask) return ERR_NOT_FOUND

        const requests = boostTask.res.map(res => ({
            to: res.lab,
            resType: res.resource,
            amount: res.amount - env.getObjectById(res.lab).store[res.resource]
        }))
        addTransportTask(room, LabTransportType.LabIn, requests)
        boostTask.state = BoostState.GetResource
        return OK
    }

    /**
     * 结束强化任务
     */
    const finishBoost = function (taskId: number): void {
        const task = db.queryBoostTaskById(taskId)
        if (!task) return
        task.state = BoostState.ClearResource
    }

    return {
        runBoostWork,
        addBoostTask,
        boostCreep,
        reloadBoostTask,
        getBoostState: db.queryBoostState,
        /**
         * 移除强化任务
         * @param taskId 要移除的任务索引
         */
        removeBoostTask: db.deleteBoostTask,
        finishBoost
    }
}
