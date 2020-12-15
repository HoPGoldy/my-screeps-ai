/**
 * 房间物流任务模块
 * 
 * 该模块处理房间中的物流任务，包括：spawn、extension、tower 能量填充，lab 运输等等
 * 但是该模块不负责中央集群的物流任务
 */

class RoomTransport {
    /**
     * 本物流对象所处的房间名
     */
    roomName: string

    /**
     * 当前正在执行的所有物流任务
     */
    tasks: Map<string, RoomTransportTasks> = new Map()

    /**
     * 正在执行本房间物流任务的所有 creep
     */
    transporters: Id<Creep>[] = []

    constructor(roomName: string) {

    }

    /**
     * 添加一个任务
     */
    public addTask(task: RoomTransportTasks, priority: number) {

    }

    /**
     * 将本房间任务都保存至内存
     */
    private saveTask() {

    }

    /**
     * 进行任务调度
     * 给当前现存的任务按照优先级重新分配 creep
     */
    private dispatchTask() {
        // 如果优先级高的任务没人做，就从优先级最低的任务开始抽人，以此尽量保持 creep 执行原来的任务
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
    public hasTask() {

    }

    /**
     * 移除一个任务
     */
    public removeTask() {

    }
}

/**
 * 向房间原型挂载物流对象
 */
const mountTransport = function () {

}