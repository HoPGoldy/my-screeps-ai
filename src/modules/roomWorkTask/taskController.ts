import { log } from 'utils'
import { getRoomStats } from 'modules/stateCollector'
import { noTask, transportActions } from './actions'
import { HARVEST_MODE } from 'setting'

/**
 * 能量获取速率到调整期望的 map
 * 能量获取速率越高，工人数量就越多
 * 
 * @todo 下面的速率到期望的值还需要实测确定
 * 
 * @property {} rate 能量获取速率
 * @property {} expect 对应的期望
 */
const WORK_PROPORTION_TO_EXPECT = [
    { rate: 50, expect: 2 },
    { rate: 10, expect: 1 },
    { rate: -10, expect: 0 },
    { rate: -50, expect: -1 },
    { rate: -100, expect: -2 }
]

export default class RoomWork implements RoomWorkType {
    /**
     * 本工作对象所处的房间名
     */
    readonly roomName: string

    /**
     * 当前正在执行的所有工作任务
     */
    tasks: AllRoomWorkTask[] = []

    /**
     * 构造- 管理指定房间的工作任务
     * 
     * @param roomName 要管理任务的房间名
     */
    constructor(roomName: string) {
        this.roomName = roomName
        this.initTask()
    }

    /**
     * 添加一个工作任务
     * 允许添加多个同类型物流任务，所以如果只想发布唯一任务的话，在发布前需要自行检查是否已经包含任务
     * 
     * @returns 该工作任务的唯一索引
     */
    public addTask(task: AllRoomWorkTask): number {
        task.key = new Date().getTime() + (this.tasks.length * 0.1)
        // 发布任务的时候为了方便可以不填这个，这里给它补上
        if (!task.executor) task.executor = []

        // 因为 this.tasks 是按照优先级降序的，所以这里要找到新任务的插入索引
        let insertIndex = this.tasks.length
        this.tasks.find((existTask, index) => {
            // 老任务的优先级更高，不能在这里插入
            if (existTask.priority >= task.priority) return false

            insertIndex = index
            return true
        })

        // 在目标索引位置插入新任务并重新分配任务
        this.tasks.splice(insertIndex, 0, task)
        this.dispatchTask()
        this.saveTask()

        return task.key
    }

    /**
     * 通过任务索引获取指定任务
     * 
     * @param taskKey 要查询的任务索引
     * @returns 对应的任务，没有的话则返回 undefined
     */
    public getTask(taskKey: number): AllRoomWorkTask | undefined {
        if (!taskKey) return undefined
        return this.tasks.find(task => task.key === taskKey) as AllRoomWorkTask
    }

    /**
     * 从内存中重建任务队列
     */
    private initTask() {
        if (!Memory.rooms || Memory.rooms[this.roomName]) return;
        // 从内存中解析数据
        const taskData: WorkTaskData = JSON.parse(Memory.rooms[this.roomName].workTasks || '[]')
        this.tasks = taskData
    }

    /**
     * 将本房间工作任务都保存至内存
     */
    private saveTask() {
        if (!Memory.rooms) Memory.rooms = {}
        Memory.rooms[this.roomName].workTasks = JSON.stringify(this.tasks)
    }

    /**
     * 进行任务调度
     * 给当前现存的任务按照优先级重新分配 creep
     */
    private dispatchTask() {
        // 找到所有缺人手的任务
        let unstartTasks = this.tasks.filter(task => task.executor.length <= 0)
        
        // 生成遍历索引，例如任务数组长度为 5，将返回 4 3 2 1 0 1 2 3 4
        const forItem = [
            ...[...Array(this.tasks.length).keys()].reverse(),
            ...[...Array(this.tasks.length).keys()].splice(1)
        ]
        // 先优先级从低往高遍历，让额外的工人往高优先级任务富集
        // 然后优先级从高到低遍历，避免高优先级任务很多人而低优先级任务没人做
        for (const i of forItem) {
            const currentTask = this.tasks[i]

            // 没有多余工人，检查下一个任务
            if (currentTask.executor.length <= 1) continue

            const extraWorkers = this.getExtraWorker(currentTask)
            // 把多余的工人分配到缺人的任务上
            // 如果自己帮不了的话，就会把任务存放到 cantHelpTask 交给下个任务帮忙
            const cantHelpTask = []
            for (let j = 0; j < unstartTasks.length; j++) {
                const checkTask = unstartTasks[j]

                // 检查下自己有没有该任务缺的人，有就分一个给他
                const neededWorker = extraWorkers[String(checkTask.require)]
                if (neededWorker && neededWorker.length > 0) {
                    checkTask.executor.push(neededWorker.shift().id)
                }
                // 该任务是特殊任务并且自己没有对应类型的，就分一个普通工人过去
                else if (checkTask.require) {
                    this.setCreepTask(extraWorkers['undefined'].shift(), checkTask)
                }
                else cantHelpTask.push(checkTask)

                // 如果人都分完了就结束多余工人分配
                if (Object.values(extraWorkers).every(workers => workers.length <= 0)) {
                    cantHelpTask.push(...unstartTasks.splice(j + 1))
                    break
                }
            }

            // 安置所有的未分配单位
            Object.keys(extraWorkers).forEach(workerType => {
                if (extraWorkers[workerType].length <= 0) true

                // 先找到可以接受未分配单位的最高级任务，任务要满足如下条件：
                const pushTarget = this.tasks.find(task => (
                    // 允许多人同时工作
                    !task.need1 &&
                    // 工人类型是自己需要的
                    workerType === task.require &&
                    // 优先级更高
                    task.priority > currentTask.priority
                )) || currentTask
                
                // 分配单位
                extraWorkers[workerType].map(creep => this.setCreepTask(creep, pushTarget))
            })

            unstartTasks = cantHelpTask
            // 如果还有没完成的任务，就继续进行循环
            if (unstartTasks.length <= 0) break
        }

        // 如果现在还有没做完的任务的话，就说明人手不够了，从低等级任务调人
        // 这里调人和上面的区别在于，上面会保留至少一个，这里会直接把最后一个调过去
        if (unstartTasks.length > 0) {
            for (let i = this.tasks.length - 1; i >= 0; i--) {
                const lowTask = this.tasks[i]

                // lowTask 是当前优先级最低的任务，而 unstartTasks[0] 是这个数组里优先级最高的任务
                // 如果优先级最低的 lowTask 都比 unstartTasks[0] 高的话，那就没有必要比下去了，后面的肯定也是更高
                if (lowTask.priority >= unstartTasks[0].priority) break

                // 如果这个任务也没人的话就检查下一个任务
                // 这里只对比 lowTask.executor[0] 的身体类型是因为走到这一步时每个任务肯定只有一个工人了
                // （不然早在上面的循环里分配给 unstartTasks 了）
                if (lowTask.executor.length <= 0) continue

                const worker = Game.getObjectById(lowTask.executor[0])
                // 唯一干活的还是个死人（太可怜了），移除并检查下一个
                if (!worker) {
                    lowTask.executor.shift()
                    continue
                }
                // 工人类型不符合，检查下一个
                if (worker.memory.bodyType !== lowTask.require) continue

                // 低优先级任务把自己的工人传递给高优先级任务
                lowTask.executor.shift()
                // 这里的 worker 就是上面这句 shift 出去的工人
                this.setCreepTask(worker, unstartTasks[0])
                // 移除这个已经分配完的任务
                unstartTasks.shift()
                if (unstartTasks.length <= 0) break
            }
        }
    }

    /**
     * 从任务中剥离额外的工人
     * 会修改传入任务的执行工人数组
     * 
     * @param task 要剥离额外工人的任务
     */
    private getExtraWorker(task: AllRoomWorkTask): _.Dictionary<Creep[]> {
        const workingCreep = task.executor.map(id => Game.getObjectById(id)).filter(Boolean)

        // 是特殊任务
        if (task.require) {
            // 找到需要的工人
            const requireWorker = workingCreep.find((worker, index) => {
                if (worker.memory.bodyType !== task.require) return false

                task.executor.splice(index, 1)
                return true
            })

            // 如果有的话就把其他的工人返回出去
            if (requireWorker) {
                const extraWorkers = workingCreep
                task.executor = [requireWorker.id]

                return _.groupBy(extraWorkers, w => w.memory.bodyType)
            }
        }

        task.executor = [workingCreep[0].id]
        // 不是特殊任务，或者是特殊任务但是没有对应的特殊工人
        return _.groupBy(workingCreep.splice(1), w => w.memory.bodyType)
    }

    /**
     * 给工作单位分配任务
     * 
     * @param creeps 要分配任务的 creep 
     */
    private giveJob(creeps: Creep[]) {
        let needRedispath = false

        // 直接塞到优先级最低的任务里，后面会重新分派
        for (const creep of creeps) {
            for (let i = this.tasks.length - 1; i > 0; i--) {
                if (
                    // 身体类型不符合需求
                    this.tasks[i].require !== creep.memory.bodyType ||
                    // 或者该任务只需要一个工作单位
                    this.tasks[i].need1 && this.tasks[i].executor.length > 1
                ) continue

                this.tasks[i].executor.push(creep.id)
                needRedispath = true
            }
        }

        needRedispath && this.dispatchTask()
    }

    /**
     * 获取应该执行的任务逻辑
     * 会通过 creep 内存中存储的当前执行任务字段来判断应该执行那个任务
     */
    public getWork(creep: MyCreep<'worker'>): RoomTaskAction {
        const { taskKey } = creep.memory
        let task = this.getTask(taskKey)

        // 是新人，分配任务
        if (!task) {
            // 任务队列为空，不需要执行工作
            if (this.tasks.length <= 0) return noTask(creep)

            this.giveJob([creep])
            this.saveTask()
            // 分配完后重新获取任务
            task = this.getTask(taskKey)
        }
        const actionGenerator: WorkActionGenerator = transportActions[task.type]

        // 分配完后获取任务执行逻辑
        return actionGenerator(creep, task, taskKey, this)
    }

    /**
     * 是否存在某个任务
     * 
     * @returns 存在则返回该任务及其在 this.tasks 中的索引，不存在则返回 undefined
     */
    public hasTask(taskType: AllWorkTaskType): boolean {
        return !!this.tasks.find(task => task.type === taskType)
    }

    /**
     * 更新指定任务
     * 如果任务包含 key 的话将使用 key 进行匹配
     * 否则的话将更新 taskType 符合的任务（如果包含多个同类型的任务的话则都会更新）
     * 
     * @param newTask 要更新的任务
     * @param addWhenNotFound 当没有匹配到任务时是否新建任务，默认为 true
     * @returns 被更新任务的索引，如果新建了任务则返回新任务的索引，若更新了多个任务的话则返回最后一个任务的索引
     */
    public updateTask(newTask: AllRoomWorkTask, addWhenNotFound: boolean = true): number {
        // 是否找到了要更新的任务
        let notFound = true
        // 是否需要重新分派任务
        let needRedispath = false
        // 要更新任务的索引
        let taskKey = newTask.key

        // 查找并更新任务
        this.tasks = this.tasks.map(task => {
            if (task.key !== newTask.key && task.type !== newTask.type) return task

            notFound = false
            taskKey = newTask.key || task.key
            // 状态变化就需要重新分派
            if (task.priority !== newTask.priority || task.need1 !== newTask.need1) {
                needRedispath = true
            }

            return Object.assign(task, newTask)
        })

        // 没找到就尝试更新、找到了就尝试重新分配
        if (notFound && addWhenNotFound) taskKey = this.addTask(newTask)
        else if (needRedispath) this.dispatchTask()

        return taskKey
    }

    /**
     * 移除一个任务
     * 
     * @param taskKey 要移除的任务索引
     */
    public removeTask(taskIndex: number): OK | ERR_NOT_FOUND
    public removeTask(taskIndex: AllWorkTaskType): OK | ERR_NOT_FOUND
    public removeTask(taskIndex: number | AllWorkTaskType): OK | ERR_NOT_FOUND {
        this.tasks = this.tasks.filter(task => {
            if (typeof taskIndex === 'number') {
                if (task.key !== taskIndex) return true
            }
            else {
                if (task.type !== taskIndex) return true
            }

            // 给干完活的搬运工重新分配任务
            const extraCreeps = task.executor.map(id => Game.getObjectById(id)).filter(Boolean)
            this.giveJob(extraCreeps)
            return false
        })

        this.saveTask()
        return OK
    }

    /**
     * 向指定任务安排指定工作单位
     * 
     * @param creep 要分配的 creep
     * @param task 要分配到的任务
     */
    private setCreepTask(creep: Creep, task: AllRoomWorkTask): void {
        if (!creep || !task) {
            Game.rooms[this.roomName].log(`错误的工作分配 ${creep} > ${task}`, 'workTask', 'red')
            return
        }

        task.executor.push(creep.id)
        creep.memory.taskKey = task.key
    }

    /**
     * 获取当前的工人调整期望
     * 返回的整数值代表希望增加（正值）/ 减少（负值）多少工作单位
     * 返回 0 代表不需要调整工作单位数量
     */
    public getExpect(): number {
        const stats = getRoomStats(this.roomName)
        // 没有统计或者能量获取速率为零，不调整搬运工数量
        if (!stats || !stats.energyGetRate) return 0

        // 工作时长占比从高到底找到期望调整的搬运工数量
        const currentExpect = WORK_PROPORTION_TO_EXPECT.find(opt => stats.energyGetRate >= opt.rate)

        return currentExpect?.expect !== undefined ? currentExpect.expect : -2
    }

    /**
     * 规划能量采集任务
     * 
     * 因为能量采集任务设置起来比较麻烦，这里提供一个通用的自适应设置方法（不强制使用，也可以自己实现）
     * 调用一次即可根据房间内的 link、container 之类的设置所有的能量采集任务
     * 如果没有的话将新建任务
     */
    public planEnergyHarvestTask() {
        const room = Game.rooms[this.roomName]
        if (!room) {
            log(`无法访问指定房间 ${this.roomName}，取消能量采集任务规划`, ['workerTask'], 'red')
            return undefined
        }

        const harvestTasks = room.source.map((source, index) => {
            const task: WorkTasks['harvest'] = {
                type: 'harvest',
                id: source.id,
                mode: HARVEST_MODE.START,
                // 这个很重要，一定要保证这个优先级是最高的
                priority: 10,
                need1: true
            }

            // 找到附近的 link
            const nearLink = room[STRUCTURE_LINK].find(link => source.pos.inRangeTo(link, 2))

            // 有 link，TRANSPORT 模式
            if (nearLink) {
                task.targetId = nearLink.id
                task.mode = HARVEST_MODE.TRANSPORT
                return task
            }

            // 找到附近的 container
            const nearContainer = room[STRUCTURE_CONTAINER].find(container => source.pos.inRangeTo(container, 1))

            // 有 container，SIMPLE 模式
            if (nearContainer) {
                task.targetId = nearContainer.id
                task.mode = HARVEST_MODE.SIMPLE
                return task
            }

            // 啥都没有，起始模式
        })

        // const harvestTasks = this.tasks.filter(task => task.type === 'harvest')
    }
}