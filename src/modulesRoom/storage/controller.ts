import { crossMerge } from '@/utils'
import RoomAccessor from '../RoomAccessor'
import { BALANCE_CONFIG, ENERGY_REQUEST_LIMIT, ENERGY_SHARE_LIMIT } from './constant'
import { BalanceDirection, BalanceResult } from './types'

/**
 * storage 控制器
 */
export default class StorageController extends RoomAccessor<undefined> {
    constructor(roomName: string) {
        super('storage', roomName, 'storage', undefined)
    }

    get storage() {
        return this.room.storage
    }

    get terminal() {
        return this.room.terminal
    }

    /**
     * storage 主要入口
     */
    public run(): void {
        if (Game.time % 3000) return
        this.requestEnergyCheck()

        if (Game.time % 10000) return
        this.shareEnergyCheck()
    }

    /**
     * 检查是否需要请求能量支援
     */
    public requestEnergyCheck() {
        const energyAmount = this.storage.store[RESOURCE_ENERGY]

        // 能量太少了，请求资源共享
        if (energyAmount < ENERGY_REQUEST_LIMIT && this.terminal) {
            const room = this.room.share.request(RESOURCE_ENERGY, ENERGY_REQUEST_LIMIT - energyAmount)
            if (room) this.log(`能量过低（${energyAmount}），将接受 ${room.name} 的能量支援`)
            else this.log(`能量过低（${energyAmount}），但未找到可以支援能量的房间`)
        }
    }

    /**
     * 检查是否可以提供能量支援
     */
    public shareEnergyCheck() {
        const energyAmount = this.storage.store[RESOURCE_ENERGY]

        // 能量太多就提供资源共享
        // 这里不会移除共享，share 模块会在本房间能量不足时自动移除
        if (energyAmount >= ENERGY_SHARE_LIMIT) this.room.share.becomeSource(RESOURCE_ENERGY)
    }

    /**
     * 在 terminal 和 storage 之间平衡资源
     */
    public balanceResource(): BalanceResult[] | ERR_NOT_FOUND {
        if (!this.storage || !this.terminal) return ERR_NOT_FOUND

        // 要传递到 terminal 的任务和要传递到 storage 的任务分开放
        const toStorageTasks: BalanceResult<BalanceDirection.ToStorage>[] = []
        const toTerminalTasks: BalanceResult<BalanceDirection.ToTerminal>[] = []

        const balanceTask = _.cloneDeep(BALANCE_CONFIG)

        // 检查终端资源是否需要平衡
        Object.entries(this.terminal.store).map((
            [resourceType, terminalAmount]: [ResourceConstant, number]
        ) => {
            this.checkAndGenerateTask(resourceType, terminalAmount, toStorageTasks, toTerminalTasks)
            // 这条资源已经检查过了，移除
            delete balanceTask[resourceType]
        })

        // 检查终端里没有，但是规则里提到的资源
        // 上面只会检查终端里还有的资源，如果数量为空就不会检查了，这里会把这些资源检查补上
        Object.entries(balanceTask).map((
            [resourceType, amountLimit]: [ResourceConstant, number]
        ) => {
            const storageAmount = this.storage.store[resourceType] || 0
            if (storageAmount <= 0) return
            
            toTerminalTasks.push({
                resourceType,
                amount: Math.min(amountLimit, storageAmount),
                direction: BalanceDirection.ToTerminal
            })
        })

        // 把两组任务按照任务搬运量升序排序
        const sortedToStorageTasks = _.sortBy(toStorageTasks, ({ amount }) => amount)
        const sortedToTerminalTasks = _.sortBy(toTerminalTasks, ({ amount }) => amount)

        // storage 和 terminal 哪个剩的地方大就先往哪挪，两个方向的任务交叉执行
        const mergedTasks = this.storage.store.getFreeCapacity() > this.terminal.store.getFreeCapacity() ?
            crossMerge<BalanceResult>(sortedToStorageTasks, sortedToTerminalTasks) :
            crossMerge<BalanceResult>(sortedToTerminalTasks, sortedToStorageTasks)
        
        return mergedTasks
    }
    
    /**
     * 检查一种 terminal 里有的资源是否需要平衡
     * 如果需要的话会把任务存放到第三个和第四个参数对应的数组里
     * 
     * @param resourceType 要检查的资源
     * @param terminalAmount 该资源在 terminal 里的数量
     * @param toStorageTasks 要把资源运到 storage 的任务数组
     * @param toTerminalTasks 要把资源运到终端的任务数组
     */
    private checkAndGenerateTask(
        resourceType: ResourceConstant,
        terminalAmount: number,
        toStorageTasks: BalanceResult<BalanceDirection.ToStorage>[],
        toTerminalTasks: BalanceResult<BalanceDirection.ToTerminal>[]
    ): void {
        const configAmount = BALANCE_CONFIG[resourceType]

        if (terminalAmount > configAmount) toStorageTasks.push({
            resourceType,
            amount: configAmount - terminalAmount,
            direction: BalanceDirection.ToStorage
        })
        else if (terminalAmount < configAmount) toTerminalTasks.push({
            resourceType,
            amount: terminalAmount - configAmount,
            direction: BalanceDirection.ToTerminal
        })
    }

    /**
     * 查询房间内指定资源的数量
     * 目前会检查 storage 和 terminal 的 storage
     * 
     * @param resourceType 要查询的资源
     */
    public getResource(res: ResourceConstant): number {
        const storageAmount = this.storage ? this.storage.store[res] : 0
        const terminalAmount = this.terminal ? this.terminal.store[res] : 0

        return (storageAmount || 0) + (terminalAmount || 0)
    }
}
