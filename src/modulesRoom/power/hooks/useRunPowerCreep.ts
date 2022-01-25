import { MAX_OPS } from '../constants'
import { PowerContext, PowerMemory } from '../types'
import { MaintenanceContext } from './useMaintenance'
import { PowerTaskConfig } from './useTaskHandler'

export const useRunPowerCreep = function (
    roomName: string,
    context: PowerContext,
    maintenance: MaintenanceContext,
    taskHandler: Record<string, PowerTaskConfig>
) {
    const { env, getMemory, getResourceAmount, getPowerSpawn, goTo } = context
    const { addSkill, getCurrentTask, deleteCurrentTask, hangTask } = maintenance

    /**
     * 【主要】执行运维 pc 逻辑
     * 要进行房间运维的 pc 调用该方法并传入自己即可执行 power 任务处理工作
     *
     * @param pc 运维 pc
     */
    const runManager = function (pc: PowerCreep): void {
        if (!keepAlive(pc)) return

        const workRoom = env.getRoomByName(roomName)
        const memory = getMemory(workRoom)
        // 获取队列中的第一个任务并执行
        // 没有任务的话就搓 ops
        let powerTask = getCurrentTask()

        // 没有任务，并且 ops 不够，就搓 ops
        if (!powerTask) {
            const total = getResourceAmount(workRoom, RESOURCE_OPS)
            if (total < MAX_OPS) powerTask = PWR_GENERATE_OPS
        }
        if (!powerTask) return

        executeTask(pc, powerTask, memory)
    }

    /**
     * 处理指定 power 任务
     *
     * @param pc 该房间的运维 pc
     * @param task 要处理的任务
     */
    const executeTask = function (pc: PowerCreep, task: PowerConstant, memory: PowerMemory): void {
        // 没有该 power 就直接移除任务
        if (!pc.powers[task]) {
            pc.say(`无法处理任务 ${task}`)
            memory.working = true
            return deleteCurrentTask()
        }
        // 没冷却好就暂时挂起任务
        if (pc.powers[task].cooldown > 0) {
            // 任务是搓 ops 的话就不用挂起
            if (task !== PWR_GENERATE_OPS) hangTask()
            return
        }

        // 获取任务执行逻辑
        const taskOptioon = taskHandler[task]
        if (!taskOptioon && task !== PWR_GENERATE_OPS) {
            pc.say(`不认识任务 ${task}`)
            env.log.warning(`${pc.name} 没有和任务 [${task}] 对应的处理逻辑，任务已移除`)
            memory.working = true
            return deleteCurrentTask()
        }

        // 根据 working 字段觉得是执行 source 还是 target
        // working 的值由上个 tick 执行的 source 或者 target 的返回值决定
        if (memory.working === undefined || memory.working) {
            const result = taskOptioon.target(pc)

            // target 返回 OK 才代表任务完成了
            if (result === OK && task !== PWR_GENERATE_OPS) {
                memory.working = true
                deleteCurrentTask()
            }
            // target 资源不足了就去执行 source
            else if (result === ERR_NOT_ENOUGH_RESOURCES) memory.working = false
        }
        else {
            const result = taskOptioon.source(pc)

            // source OK 了代表资源获取完成，去执行 target
            if (result === OK) memory.working = true
            // 如果 source 还发现没资源的话就强制执行 ops 生成任务
            // 这里调用了自己，但是由于 PWR_GENERATE_OPS 的 source 阶段永远不会返回 ERR_NOT_ENOUGH_RESOURCES
            // 所以不会产生循环调用
            else if (result === ERR_NOT_ENOUGH_RESOURCES) executeTask(pc, PWR_GENERATE_OPS, memory)
        }
    }

    /**
     * 找到房间中的 powerSpawn renew 指定 pc
     *
     * @param pc 该房间的运维 pc
     * @returns OK 正在执行 renew
     * @returns ERR_NOT_FOUND 房间内没有 powerSpawn
     */
    const renew = function (pc: PowerCreep): OK | ERR_NOT_FOUND {
        const workRoom = env.getRoomByName(roomName)
        const ps = getPowerSpawn(workRoom)
        if (!ps) return ERR_NOT_FOUND

        const result = pc.renew(ps)

        if (result === ERR_NOT_IN_RANGE) {
            goTo(pc, ps.pos, { checkTarget: false })
        }

        return OK
    }

    /**
     * 保证自己一直活着
     *
     * @returns 是否可以执行后面的工作
     */
    const keepAlive = function (pc: PowerCreep): boolean {
        // 离死还早，继续工作
        if (pc.ticksToLive > 100) return true

        // 快凉了就尝试重生
        if (pc.ticksToLive <= 100) {
            pc.say('插座在哪！')
            if (renew(pc) === OK) return false
        }

        // 执行到这里就说明是真凉了，如果在冷却的话就等着
        if (pc.spawnCooldownTime) return false

        // 可以复活了
        spawnAtRoom(pc, roomName)
        return false
    }

    /**
     * 在指定房间重生自己
     *
     * @param spawnRoomName 要生成到的房间名
     * @returns OK 生成成功
     * @returns ERR_INVALID_ARGS 该房间没有视野
     * @returns ERR_NOT_FOUND 该房间不存在或者其中没有 PowerSpawn
     */
    const spawnAtRoom = function (pc: PowerCreep, spawnRoomName: string): OK | ERR_INVALID_ARGS | ERR_NOT_FOUND {
        const targetRoom = env.getRoomByName(spawnRoomName)
        if (!targetRoom || !getPowerSpawn(targetRoom)) {
            env.log.warning('找不到指定房间或者房间内没有 powerSpawn，请重新指定工作房间')
            return ERR_NOT_FOUND
        }

        const spawnResult = pc.spawn(getPowerSpawn(targetRoom))

        if (spawnResult === OK) {
            addSkill(pc)
            return OK
        }
        else {
            env.log.warning(`${pc.name} 孵化异常! 错误码: ${spawnResult}`)
            return ERR_INVALID_ARGS
        }
    }

    return runManager
}
