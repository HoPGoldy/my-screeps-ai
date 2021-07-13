import { Color } from '@/modulesGlobal'
import RoomAccessor from '../RoomAccessor'
import { ENERGY_SHARE_LIMIT } from '../storage/constant'
import { RoomShareTask, ResourceSourceMap } from './types'
import { getSendAmount } from './utils'

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
     * @returns 响应请求的房间
     */
    public request(resourceType: ResourceConstant, amount: number): Room {
        const targetRoom = this.getSource(resourceType)
        if (!targetRoom) return undefined

        const addResult = targetRoom.share.handle(this.roomName, resourceType, amount)
        return addResult ? targetRoom : undefined
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
        if (!this.memory) return
        const { amount: taskAmount, resourceType, target } = this.memory

        if (taskAmount <= 0) {
            this.log(`共享资源的数量不可为负 (${resourceType}/${taskAmount})，任务已移除`, Color.Yellow)
            this.memory = undefined
            return
        }

        // 获取本次要发送的数量
        const { total } = terminal.room.myStorage.getResource(resourceType)
        const { amount: sendAmount, cost } = getSendAmount(
            Math.min(taskAmount, total),
            target,
            terminal.room.name,
            terminal.store.getFreeCapacity()
        )
        console.log(this.roomName, '共享任务计算结果', target, resourceType, sendAmount, cost)
        if (sendAmount <= 0) {
            this.log(`${this.roomName} Terminal 剩余空间不足 (${resourceType}/${taskAmount})，任务已移除`, Color.Yellow)
            this.memory = undefined
            return
        }

        // 如果终端存储的资源数量已经足够了
        if (terminal.store[resourceType] >= sendAmount) {
            this.sendShareResource(resourceType, sendAmount, cost, target, terminal)
        }
        // 如果不足就尝试运过来
        else {
            this.getShareResource(resourceType, sendAmount, target, terminal)
        }
    }

    /**
     * 执行资源发送
     */
    private sendShareResource(
        resourceType: ResourceConstant,
        sendAmount: number,
        cost: number,
        target: string,
        terminal: StructureTerminal
    ) {
        // 如果要转移能量就需要对路费进行针对检查
        const costCondition = (resourceType === RESOURCE_ENERGY) ?
            terminal.store[RESOURCE_ENERGY] - sendAmount < cost :
            terminal.store[RESOURCE_ENERGY] < cost

        // 如果路费不够的话就继续等
        if (costCondition) {
            terminal.room.centerTransport.send(
                STRUCTURE_STORAGE, STRUCTURE_TERMINAL,
                RESOURCE_ENERGY, cost, 'share'
            )
            return
        }

        // 路费够了就执行转移
        const sendResult = terminal.send(
            resourceType, sendAmount, target,
            `HaveFun! 来自 ${terminal.owner.username} 的资源共享 - ${this.roomName}`
        )

        // 任务执行成功，更新共享任务
        if (sendResult == OK) this.updateTaskAmount(sendAmount)
        else if (sendResult == ERR_INVALID_ARGS) {
            this.log(`共享任务参数异常，无法执行传送，已移除`, Color.Yellow)
            this.memory = undefined
        }
        else this.log(`执行共享任务出错, 错误码：${sendResult}`, Color.Yellow)
    }

    /**
     * terminal 里的资源不足，执行资源获取
     */
    private getShareResource(
        resourceType: ResourceConstant,
        sendAmount: number,
        target: string,
        terminal: StructureTerminal
    ) {
        const { total } = terminal.room.myStorage.getResource(resourceType)
        if (total < sendAmount) {
            this.log(
                `由于 ${resourceType} 资源不足 ${terminal.store[resourceType] || 0}/${sendAmount}` +
                `${target} 的共享任务已被移除`
            )
            this.memory = undefined
            return
        }

        const getAmount = sendAmount - terminal.store[RESOURCE_ENERGY]

        terminal.room.centerTransport.send(
            STRUCTURE_STORAGE, STRUCTURE_TERMINAL,
            resourceType, getAmount, 'share'
        )
    }

    /**
     * 更新共享任务资源数量
     * 如果一次发不完的话，可以使用该方法更新资源数量
     * 如果任务更新后数量为 0 的话就会移除任务
     * 
     * @param sendedAmount 已经发送的资源数量
     * @returns 是否更新成功
     */
    private updateTaskAmount(sendedAmount: number): OK | ERR_NOT_FOUND {
        if (!this.memory) return ERR_NOT_FOUND
        this.memory.amount = this.memory.amount - sendedAmount
        if (this.memory.amount <= 0) this.memory = undefined
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

            // 如果请求的资源已经没有的话就暂时跳过（因为无法确定之后是否永远无法提供该资源）
            const { total: existAmount } = room.myStorage.getResource(resourceType)
            if (existAmount <= 0) return true

            // 接受任务的房间就是你了！
            targetRoom = room
            return true
        })

        // 把上面筛选出来的空字符串元素去除
        return targetRoom
    }
}