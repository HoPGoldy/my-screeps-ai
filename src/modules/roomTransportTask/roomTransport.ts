export default class RoomTransport implements RoomTransportType {
    /**
     * 本物流对象所处的房间名
     */
    roomName: string

    /**
     * 当前正在执行的所有物流任务
     */
    tasks: Map<AllTransportTaskType, TransportTasks[AllTransportTaskType]> = new Map()

    /**
     * 没事干的搬运工，会先记录下来，等到有新工作了会优先分配
     */
    freeTransporters: Id<Creep>[] = []

    /**
     * 构造- 管理指定房间的物流任务
     * 
     * @param roomName 要管理物流任务的房间名
     */
    constructor(roomName: string) {
        this.roomName = roomName
        this.initTask()
    }

    /**
     * 添加一个物流任务
     * 如果之前已经有同种任务的话将会进行覆盖
     * 
     * @returns 是否已覆盖同种任务
     */
    public addTask(task: RoomTransportTasks): boolean {
        if (!task.executor) task.executor = []

        // 没有同种任务，直接添加
        if (!this.tasks.has(task.type)) {
            this.tasks.set(task.type, task)
            this.dispatchTask()
            this.saveTask()
            return false
        }

        const oldTask = this.tasks.get(task.type)
        this.tasks.set(task.type, task)
        // 如果优先级或者需要执行人数变了，就重新分配任务
        if (oldTask.priority !== task.priority || oldTask.need !== task.need) {
            this.dispatchTask()
            this.saveTask()
        }

        return true
    }

    /**
     * 从内存中重建物流任务队列
     */
    private initTask() {
        if (!Memory.rooms) return;
        // 从内存中解析数据
        const transportTaskDatas: TransportData = JSON.parse(Memory.rooms[this.roomName].transport || '{}')

        // 设置到实例
        for (const taskType in transportTaskDatas) {
            this.tasks.set(taskType as AllTransportTaskType, transportTaskDatas[taskType])
        }
    }

    /**
     * 将本房间物流任务都保存至内存
     */
    private saveTask() {
        const data = {}
        for (const [k, v] of this.tasks) data[k] = v

        if (!Memory.rooms) Memory.rooms = {}
        Memory.rooms[this.roomName].transport = JSON.stringify(data)
    }

    /**
     * 进行任务调度
     * 给当前现存的任务按照优先级重新分配 creep
     */
    private dispatchTask() {
        this.clearFreeTransporter()

        // 把现存的任务按照优先级从高到低排序
        const sortedTasks = _.sortBy(Array.from(this.tasks).map(item => item[1]), task => -task.priority);
        // 如果优先级高的任务没人做，就从优先级最低的任务开始抽人，尽量保持 creep 执行原来的任务
        // 这里用双指针实现上面的逻辑
        let i = 0, j = sortedTasks.length - 1
        while (i <= sortedTasks.length - 1 || j >= 0) {
            const task = sortedTasks[i]
            // 工作人数符合要求，检查下一个
            if (task.executor.length >= task.need) continue

            // 执行人数不足，遍历不足的次数尝试补满
            for (let k = 0; k < task.need - task.executor.length; k ++) {
                // 取出一个空闲的搬运工
                const freeCreep = this.getFreeTransporter()
                // 有空闲的话就去执行任务
                if (freeCreep) {
                    task.executor.push(freeCreep)
                    continue
                }

                // 没有空闲的了，开始从优先级低的任务抽人
                while (j >= 0 || k >= task.need - task.executor.length) {
                    const lowTask = sortedTasks[j]
                    if (task.executor.length <= task.need) {
                        j --
                        continue
                    }

                    // 从人多的低级任务里抽调一个人到高优先级任务
                    task.executor.push(lowTask.executor.shift())
                    k ++
                }
            }

            i ++
        }
    }

    /**
     * 去除无用的空闲运输工
     * 包括重复的和已经去世的
     */
    private clearFreeTransporter() {
        this.freeTransporters = _.uniq(this.freeTransporters).filter(creepId => Game.getObjectById(creepId))
    }

    /**
     * 取出一个没事干的运输工
     * 目前只是简单的弹出第一个搬运工，以后可以在这里扩展一下，接受任务作为参数，然后更智能的选择运输工
     */
    private getFreeTransporter() {
        if (this.freeTransporters.length <= 0) return undefined
        return this.freeTransporters.shift()
    }

    /**
     * 获取应该执行的任务
     */
    public getTask(creep: Creep) {
        // 会通过 creep 内存中存储的当前执行任务字段来判断应该执行那个任务
    }

    /**
     * 是否存在某个任务
     */
    public hasTask(taskType: AllTransportTaskType) {
        return this.tasks.has(taskType)
    }

    /**
     * 移除一个任务
     */
    public removeTask(taskType: AllTransportTaskType): OK | ERR_NOT_FOUND {
        const task = this.tasks.get(taskType)
        if (!task) return ERR_NOT_FOUND
        
        // 把处理该任务的 creep 设置为无业游民并去重
        task.executor.forEach(creepId => this.freeTransporters.push(creepId))
        this.clearFreeTransporter()
        // 删除任务
        this.tasks.delete(taskType)
        // 重新分配并保存任务
        this.dispatchTask()
        this.saveTask()
    }
}