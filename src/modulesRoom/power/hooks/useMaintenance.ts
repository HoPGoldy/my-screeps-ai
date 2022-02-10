import { PWR_ENABLE_ROOM } from '../constants'
import { PowerContext } from '../types'

/**
 * 包含房间 power 运维的相关方法
 */
export const useMaintenance = function (roomName: string, context: PowerContext) {
    const { getMemory, env } = context

    /**
     * 本房间内可用的 power
     * 需要调用 addSkill 进行注册
     */
    let existPower: PowerConstant[] = []

    /**
     * 把指定 pc（一般都是该房间的运维 pc）的能力同步过来
     *
     * @param pc 该房间的运维 pc
     */
    const addSkill = function (pc: PowerCreep): void {
        existPower = Object.keys(pc.powers).map(Number) as PowerConstant[]
    }

    /**
     * 检查本房间是否可以使用某个 power 能力
     */
    const hasSkill = function (power: PowerConstant) {
        return existPower.includes(power)
    }

    /**
     * 向房间中发布 power 请求任务
     * 该方法已集成了 isPowerEnabled 判定，调用该方法之前无需额外添加房间是否启用 power 的逻辑
     *
     * @param task 要添加的 power 任务
     * @param priority 任务优先级位置，默认追加到队列末尾。例：该值为 0 时将无视队列长度直接将任务插入到第一个位置
     * @returns OK 添加成功
     * @returns ERR_NO_BODYPART 当前房间的 pc 无法使用该任务
     * @returns ERR_NAME_EXISTS 已经有同名任务存在了
     * @returns ERR_INVALID_TARGET 房间控制器未启用 power
     */
    const addTask = function (task: PowerConstant, priority: number = null): OK | ERR_NAME_EXISTS | ERR_INVALID_TARGET | ERR_NO_BODYPART {
        const workRoom = env.getRoomByName(roomName)
        const memory = getMemory(workRoom)

        //  如果房间还没激活的话，就往任务队列里推送激活任务
        if (!workRoom.controller.isPowerEnabled) {
            if (!hasTask(PWR_ENABLE_ROOM)) {
                if (!memory.tasks) memory.tasks = []
                memory.tasks.push(PWR_ENABLE_ROOM)
            }
            return ERR_INVALID_TARGET
        }

        // 有相同的任务，拒绝添加
        if (hasTask(task)) return ERR_NAME_EXISTS

        // 干不了这个活，拒绝添加
        if (!hasSkill(task)) return ERR_NO_BODYPART

        if (!memory.tasks) memory.tasks = []
        // 发布任务到队列
        if (!priority) memory.tasks.push(task)
        // 追加到队列指定位置
        else memory.tasks.splice(priority, 0, task)

        return OK
    }

    /**
     * 检查是否已经存在指定任务
     *
     * @param task 要检查的 power 任务
     */
    const hasTask = function (task: PowerConstant): boolean {
        const workRoom = env.getRoomByName(roomName)
        const memory = getMemory(workRoom)
        if (!memory.tasks || memory.tasks.length <= 0) return false

        return !!memory.tasks.find(power => power === task)
    }

    /**
     * 获取当前的 power 任务
     */
    const getCurrentTask = function (): PowerConstant | undefined {
        const workRoom = env.getRoomByName(roomName)
        const memory = getMemory(workRoom)

        if (memory.tasks.length <= 0) return undefined
        else return memory.tasks[0]
    }

    /**
     * 挂起当前任务
     * 将会把最前面的 power 任务移动到队列末尾
     */
    const hangTask = function (): void {
        const workRoom = env.getRoomByName(roomName)
        const memory = getMemory(workRoom)
        if (!memory.tasks) return

        memory.tasks.push(memory.tasks.shift())
    }

    /**
     * 移除第一个 power 任务
     */
    const deleteCurrentTask = function (): void {
        const workRoom = env.getRoomByName(roomName)
        const memory = getMemory(workRoom)
        if (!memory.tasks) return

        memory.tasks.shift()
        if (memory.tasks.length <= 0) delete memory.tasks
    }

    return {
        addSkill, addTask, hasTask, getCurrentTask, hangTask, deleteCurrentTask
    }
}

export type MaintenanceContext = ReturnType<typeof useMaintenance>
