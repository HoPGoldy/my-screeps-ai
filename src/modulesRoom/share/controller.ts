import { ENERGY_SHARE_LIMIT } from '@/setting'
import RoomAccessor from '../RoomAccessor'
import { RoomShareTask, ResourceSourceMap } from './types'

/**
 * 全局的资源来源表存放在 Memory 的哪个键上
 */
const RESOURCE_SOURCE_SAVE_KEY = 'resourceSourceMap'

export default class RoomShareController extends RoomAccessor<RoomShareTask> {
    constructor(roomName: string) {
        super('roomShare', roomName, 'shareTask', undefined)
    }

    /**
     * 允许外部模块获取当前的共享任务
     */
    public get task(): RoomShareTask {
        return this.memory
    }

    /**
     * 公共的资源来源表
     * 允许设置局部值，不允许覆盖
     */
    private get resourceSource(): ResourceSourceMap {
        if (!Memory[RESOURCE_SOURCE_SAVE_KEY]) Memory[RESOURCE_SOURCE_SAVE_KEY] = {}
        return Memory[RESOURCE_SOURCE_SAVE_KEY]
    }

    /**
     * 向其他房间请求资源共享
     * 
     * @param resourceType 请求的资源类型
     * @param amount 请求的数量
     */
    public request(resourceType: ResourceConstant, amount: number): boolean {
        const targetRoom = this.getSource(resourceType)
        if (!targetRoom) return false

        const addResult = targetRoom.share.handle(this.roomName, resourceType, amount)
        return addResult
    }

    /**
     * 将本房间添加至资源来源表中
     * 
     * @param resourceType 添加到的资源类型
     */
    public becomeSource(resourceType: ResourceConstant): boolean {
        if (!(resourceType in this.resourceSource)) this.resourceSource[resourceType] = []

        const alreadyRegister = this.resourceSource[resourceType].find(name => name == this.roomName)
        // 如果已经被添加过了就返回 false
        if (alreadyRegister) return false

        this.resourceSource[resourceType].push(this.roomName)
        return true
    }

    /**
     * 从资源来源表中移除本房间
     * 
     * @param resourceType 从哪种资源类型中移除
     */
    public leaveSource(resourceType: ResourceConstant): void {
        // 没有该资源就直接停止
        if (!(resourceType in this.resourceSource)) return 

        // 获取该房间在资源来源表中的索引
        _.pull(this.resourceSource[resourceType], this.roomName)
        // 列表为空了就直接移除
        if (this.resourceSource[resourceType].length <= 0) delete this.resourceSource[resourceType]
    }

    /**
     * 让本房间处理共享任务
     * 
     * @param targetRoom 资源发送到的房间
     * @param resourceType 共享资源类型
     * @param amount 共享资源数量
     * @returns 是否成功添加
     */
    public handle(targetRoom: string, resourceType: ResourceConstant, amount: number): boolean {
        const selfRoom = Game.rooms[this.roomName]
        if (!selfRoom) return false

        if (this.task || !selfRoom.terminal) return false

        // 本房间内指定资源的存量
        const terminalAmount = selfRoom.terminal.store[resourceType] || 0
        const storageAmount = selfRoom.storage ? (selfRoom.storage.store[resourceType] || 0) : 0

        // 终端能发送的最大数量（路费以最大发送量计算）
        const freeSpace = selfRoom.terminal.store.getFreeCapacity()
            + terminalAmount
            - Game.market.calcTransactionCost(amount, this.roomName, targetRoom)

        // 期望发送量、当前存量、能发送的最大数量中找最小的
        const sendAmount = Math.min(amount, terminalAmount + storageAmount, freeSpace)

        this.memory = {
            target: targetRoom,
            resourceType,
            amount: sendAmount
        }

        return true
    }

    /**
     * 执行已经存在的共享任务
     * 
     * @param terminal 执行任务的终端
     */
    public execShareTask(terminal: StructureTerminal): void {
        // 获取任务
        const task = this.memory
        if (!task) return

        if (task.amount <= 0) {
            this.log(`共享资源的数量不可为负 (${task.resourceType}/${task.amount})，任务已移除`, 'yellow')
            this.memory = undefined
            return
        }

        // 如果终端存储的资源数量已经足够了
        if (terminal.store[task.resourceType] >= task.amount) {
            const cost = Game.market.calcTransactionCost(task.amount, this.roomName, task.target)

            // 如果要转移能量就需要对路费是否足够的判断条件进行下特殊处理
            const costCondition = (task.resourceType === RESOURCE_ENERGY) ?
                terminal.store[RESOURCE_ENERGY] - task.amount < cost :
                terminal.store[RESOURCE_ENERGY] < cost

            // 如果路费不够的话就继续等
            if (costCondition) {
                if (this.putEnergyToTerminal(cost) == -2) Game.notify(`[${this.roomName}] 终端中央物流添加失败 —— 等待路费, ${cost}`)
                // this.getEnergy(cost)
                return
            }

            // 路费够了就执行转移
            const sendResult = terminal.send(
                task.resourceType, task.amount, task.target,
                `HaveFun! 来自 ${terminal.owner.username} 的资源共享 - ${this.roomName}`
            )

            if (sendResult == OK) this.memory = undefined
            else if (sendResult == ERR_INVALID_ARGS) {
                this.log(`共享任务参数异常，无法执行传送，已移除`, 'yellow')
                this.memory = undefined
            }
            else this.log(`执行共享任务出错, 错误码：${sendResult}`, 'yellow')
        }
        // 如果不足
        else {
            // 如果要共享能量，则从 storage 里拿
            if (task.resourceType === RESOURCE_ENERGY) {
                if (this.putEnergyToTerminal(task.amount - terminal.store[RESOURCE_ENERGY]) == -2) {
                    this.log(`终端中央物流添加失败 —— 获取路费, ${task.amount - terminal.store[RESOURCE_ENERGY]}`, 'yellow', true)
                }
            }
            // 资源不足就不予响应
            else {
                this.log(`由于 ${task.resourceType} 资源不足 ${terminal.store[task.resourceType] || 0}/${task.amount}，${task.target} 的共享任务已被移除`)
                this.memory = undefined
            }
        }
    }

    /**
     * 从 storage 获取能量
     * @param amount 需要能量的数量
     */
    public putEnergyToTerminal(amount: number): number {
        // 添加时会自动判断有没有对应的建筑，不会重复添加
        return this.room.centerTransport.addTask({
            submit: 'share',
            source: STRUCTURE_STORAGE,
            target: STRUCTURE_TERMINAL,
            resourceType: RESOURCE_ENERGY,
            amount
        })
    }

    /**
     * 根据资源类型查找来源房间
     * 
     * @param resourceType 要查找的资源类型
     * @returns 找到的目标房间，没找到返回 null
     */
    private getSource(resourceType: ResourceConstant): Room | null {
        const SourceRoomsName = this.resourceSource[resourceType]
        if (!SourceRoomsName) return null

        // 寻找合适的房间
        let targetRoom: Room
        // 变量房间名数组，注意，这里会把所有无法访问的房间筛选出来
        this.resourceSource[resourceType] = SourceRoomsName.filter(roomName => {
            const room = Game.rooms[roomName]

            if (!room || !room.terminal) return false
            // 该房间有任务或者就是自己，不能作为共享来源
            if (room.memory.shareTask || room.name === this.roomName) return true

            // 如果请求共享的是能量
            if (resourceType === RESOURCE_ENERGY) {
                if (!room.storage) return false
                // 该房间 storage 中能量低于要求的话，就从资源提供列表中移除该房间
                if (room.storage.store[RESOURCE_ENERGY] < ENERGY_SHARE_LIMIT) return false
            }
            else {
                // 如果请求的资源已经没有的话就暂时跳过（因为无法确定之后是否永远无法提供该资源）
                if ((room.terminal.store[resourceType] || 0) <= 0) return true
            }

            // 接受任务的房间就是你了！
            targetRoom = room
            return true
        })

        // 把上面筛选出来的空字符串元素去除
        return targetRoom
    }
}