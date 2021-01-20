/**
 * 房间要执行的资源共享任务
 * 和上面的资源共享任务的不同之处在于，该任务是发布在指定房间上的，所以不需要 source
 */
interface RoomShareTask {
    /**
     * 资源的接受房间
     */
    target: string
    /**
     * 共享的资源类型
     */
    resourceType: ResourceConstant,
    /**
     * 期望数量
     */
    amount: number
}

interface RoomMemory {
    /**
     * 该房间要执行的资源共享任务
     */
    shareTask: RoomShareTask
}

/**
 * 资源来源表
 * 资源类型为键，房间名列表为值
 */
interface ResourceSourceMap {
    [resourceType: string]: string[]
}

interface Memory {
    resourceSourceMap: ResourceSourceMap,
}

interface Room {
    /**
     * 房间共享协议 - 控制器
     */
    share: InterfaceShareController
}

interface InterfaceShareController {
    /**
     * 当前的共享任务
     */
    task: RoomShareTask
    /**
     * 向其他房间请求资源共享
     * 
     * @param resourceType 请求的资源类型
     * @param amount 请求的数量
     */
    request(resourceType: ResourceConstant, amount: number): boolean
    /**
     * 将本房间添加至资源来源表中
     * 
     * @param resourceType 添加到的资源类型
     */
    becomeSource(resourceType: ResourceConstant): boolean
    /**
     * 从资源来源表中移除本房间
     * 
     * @param resourceType 从哪种资源类型中移除
     */
    leaveSource(resourceType: ResourceConstant): void
    /**
     * 让本房间处理共享任务
     * 
     * @param targetRoom 资源发送到的房间
     * @param resourceType 共享资源类型
     * @param amount 共享资源数量
     * @returns 是否成功添加
     */
    handle(targetRoom: string, resourceType: ResourceConstant, amount: number): boolean
}