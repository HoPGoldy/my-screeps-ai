import RoomAccessor from '../RoomAccessor'
import { MAX_OPS, PWR_ENABLE_ROOM } from './canstant'
import { PowerTasks } from './taskHandler'

/**
 * 房间 power 管理模块
 * 提供了一套 api 用于管理 power 任务
 */
export default class RoomPowerController extends RoomAccessor<PowerConstant[]> {
    /**
     * 本房间可以使用的 power 能力
     */
    public powers: PowerConstant[] = []

    /**
     * 实例化房间 power 管理
     * @param roomName 要管理的房间名
     */
    constructor(roomName: string) {
        super('roomPower', roomName, 'powerTasks', [])
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
    public addTask(task: PowerConstant, priority: number = null): OK | ERR_NAME_EXISTS | ERR_INVALID_TARGET | ERR_NO_BODYPART {
        //  如果房间还没激活的话，就往任务队列里推送激活任务
        if (!this.room.controller.isPowerEnabled) {
            if (!this.hasTask(PWR_ENABLE_ROOM)) {
                this.memory.push(PWR_ENABLE_ROOM)
            }
            return ERR_INVALID_TARGET
        }

        // 有相同的任务，拒绝添加
        if (this.hasTask(task)) return ERR_NAME_EXISTS

        // 干不了这个活，拒绝添加
        if (!this.powers.includes(task)) return ERR_NO_BODYPART

        // 发布任务到队列
        if (!priority) this.memory.push(task)
        // 追加到队列指定位置
        else this.memory.splice(priority, 0, task)

        return OK
    }

    /**
     * 检查是否已经存在指定任务
     * 
     * @param task 要检查的 power 任务
     */
    private hasTask(task: PowerConstant): boolean {
        return this.memory.find(power => power === task) ? true : false
    }

    /**
     * 获取当前的 power 任务
     */
    public getCurrentTask(): PowerConstant | undefined {
        if (this.memory.length <= 0) return undefined
        else return this.memory[0]
    }

    /**
     * 挂起当前任务
     * 将会把最前面的 power 任务移动到队列末尾
     */
    public hangTask(): void {
        this.memory.push(this.memory.shift())
    }

    /**
     * 移除第一个 power 任务
     */
    public deleteCurrentTask(): void {
        this.memory.shift()
    }

    /**
     * 【主要】执行运维 pc 逻辑
     * 要进行房间运维的 pc 调用该方法并传入自己即可执行 power 任务处理工作
     * 
     * @param pc 运维 pc
     */
    public runManager(pc: PowerCreep): void {
        // 获取队列中的第一个任务并执行
        // 没有任务的话就搓 ops
        let powerTask = this.getCurrentTask()

        // 没有任务，并且 ops 不够，就搓 ops
        if (!powerTask && this.room.terminal && this.room.terminal.store[RESOURCE_OPS] < MAX_OPS) {
            powerTask = PWR_GENERATE_OPS
        }
        if (!powerTask) return

        this.executeTask(pc, powerTask)
    }

    /**
     * 处理指定 power 任务
     * 
     * @param pc 该房间的运维 pc
     * @param task 要处理的任务
     */
    private executeTask(pc: PowerCreep, task: PowerConstant): void {
        // 没有该 power 就直接移除任务
        if (!pc.powers[task]) {
            pc.say(`无法处理任务 ${task}`)
            pc.memory.working = true
            return this.deleteCurrentTask()
        }
        // 没冷却好就暂时挂起任务
        if (pc.powers[task].cooldown > 0) {
            // 任务是搓 ops 的话就不用挂起
            if (task !== PWR_GENERATE_OPS) this.hangTask()
            return
        }

        // 获取任务执行逻辑
        const taskOptioon = PowerTasks[task]
        if (!taskOptioon && task !== PWR_GENERATE_OPS) {
            pc.say(`不认识任务 ${task}`)
            this.log(`没有和任务 [${task}] 对应的处理逻辑，任务已移除`, 'yellow')
            pc.memory.working = true
            return this.deleteCurrentTask()
        }

        // 根据 working 字段觉得是执行 source 还是 target
        // working 的值由上个 tick 执行的 source 或者 target 的返回值决定
        if (pc.memory.working == undefined || pc.memory.working) {
            const result = taskOptioon.target(pc, this)

            // target 返回 OK 才代表任务完成了
            if (result === OK && task !== PWR_GENERATE_OPS) {
                pc.memory.working = true
                this.deleteCurrentTask()
            }
            // target 资源不足了就去执行 source
            else if (result === ERR_NOT_ENOUGH_RESOURCES) pc.memory.working = false
        }
        else {
            const result = taskOptioon.source(pc, this)

            // source OK 了代表资源获取完成，去执行 target
            if (result === OK) pc.memory.working = true
            // 如果 source 还发现没资源的话就强制执行 ops 生成任务
            // 这里调用了自己，但是由于 PWR_GENERATE_OPS 的 source 阶段永远不会返回 ERR_NOT_ENOUGH_RESOURCES
            // 所以不会产生循环调用
            else if (result === ERR_NOT_ENOUGH_RESOURCES) this.executeTask(pc, PWR_GENERATE_OPS)
        }
    }

    /**
     * 找到房间中的 powerSpawn renew 指定 pc
     * 
     * @param pc 该房间的运维 pc
     * @returns OK 正在执行 renew
     * @returns ERR_NOT_FOUND 房间内没有 powerSpawn
     */
    public renew(pc: PowerCreep): OK | ERR_NOT_FOUND {
        if (!this.room.powerSpawn) return ERR_NOT_FOUND

        const result = pc.renew(this.room.powerSpawn)

        if (result === ERR_NOT_IN_RANGE) {
            pc.goTo(this.room.powerSpawn.pos, { checkTarget: false })
        }

        return OK
    }

    /**
     * 从 terminal 中取出 ops 传递给指定 pc
     * 
     * @param pc 该房间的运维 pc
     * @param opsNumber 要拿取的数量
     * @returns OK 拿取完成
     * @returns ERR_NOT_ENOUGH_RESOURCES 资源不足
     * @returns ERR_BUSY 正在执行任务
     */
    public giveOps(pc: PowerCreep, opsNumber: number): OK | ERR_NOT_ENOUGH_RESOURCES | ERR_BUSY {
        // 身上的够用就不去 terminal 拿了
        if (pc.store[RESOURCE_OPS] > opsNumber) return OK

        let sourceStructure: StructureTerminal | StructureStorage = undefined
        // 如果资源够的话就使用 terminal 作为目标
        if (this.room.terminal && this.room.terminal.store[RESOURCE_OPS] >= opsNumber) sourceStructure = this.room.terminal
        else return ERR_NOT_ENOUGH_RESOURCES

        // 拿取指定数量的 ops
        const actionResult = pc.withdraw(sourceStructure, RESOURCE_OPS, opsNumber)

        if (actionResult === OK) return OK
        else if (actionResult === ERR_NOT_IN_RANGE) {
            pc.goTo(sourceStructure.pos, { checkTarget: false })
            return ERR_BUSY
        }
        else {
            this.log(`执行 getOps 时出错，错误码 ${actionResult}`, 'yellow')
            return ERR_BUSY
        }
    }

    /**
     * 把指定 pc（一般都是该房间的运维 pc）的能力同步过来
     * 
     * @param pc 该房间的运维 pc
     */
    public addSkill(pc: PowerCreep): void {
        const newPowers = Object.keys(pc.powers).map(Number) as PowerConstant[]
        // 进行去重，放置房间内有多个 Pc 时互相覆盖彼此的能力
        this.powers = _.uniq([ ...newPowers, ...this.powers])
    }
}
