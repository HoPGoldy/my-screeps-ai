import { crossMerge } from '@/utils'
import RoomAccessor from '../RoomAccessor'
import { CenterStructure } from '../taskCenter/types'
import { BALANCE_CONFIG, DEFAULT_BALANCE_LIMIT, ENERGY_REQUEST_LIMIT, ENERGY_SHARE_LIMIT } from './constant'
import { BalanceDirection, BalanceResult, ResourceAmount } from './types'

/**
 * storage 控制器
 */
export default class StorageController extends RoomAccessor<undefined> {
    constructor(roomName: string) {
        super('storage', roomName, 'storage', undefined)
    }

    private get storage() {
        return this.room.storage
    }

    private get terminal() {
        return this.room.terminal
    }

    /**
     * storage 主要入口
     */
    public run(): void {
        if (Game.time % 900) return
        this.requestEnergyCheck()
        this.requestPower()

        if (Game.time % 9000) return
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
            if (room) this.log.normal(`能量过低（剩余：${energyAmount}），将接受 ${room.name} 的能量支援（共享数量：${ENERGY_REQUEST_LIMIT - energyAmount}）`)
            else {
                // 控制的房间多了才会打印这个 log，不然也挺烦的
                if (Object.keys(Game.spawns).length > 3) this.log.normal(`能量过低（${energyAmount}），但未找到可以提供支援的房间`)
            }
        }
    }

    /**
     * 检查是否需要 power 强化
     */
    private requestPower() {
        // 存储还够或者房间没有开启 power 就不发布强化任务
        if (
            this.storage.store.getFreeCapacity() > 50000 ||
            !this.room.controller.isPowerEnabled
        ) return

        this.room.power.addTask(PWR_OPERATE_STORAGE)
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
    public balanceResource(targetResource?: ResourceConstant): BalanceResult[] | ERR_NOT_FOUND {
        if (!this.storage || !this.terminal) return ERR_NOT_FOUND

        // 要传递到 terminal 的任务和要传递到 storage 的任务分开放
        const toStorageTasks: BalanceResult<BalanceDirection.ToStorage>[] = []
        const toTerminalTasks: BalanceResult<BalanceDirection.ToTerminal>[] = []

        // 指定了目标，只调度这一种资源
        if (targetResource) {
            this.checkAndGenerateTask(
                targetResource,
                this.terminal.store[targetResource],
                toStorageTasks,
                toTerminalTasks
            )
        }
        // 没有指定目标，调度所有存在的资源
        else {
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
        }

        // 将两个任务数组交叉合并在一起
        const mergedTasks = this.mergeTasks(toStorageTasks, toTerminalTasks)
        // 并且发布物流任务
        this.generateCenterTask(mergedTasks)

        return mergedTasks
    }

    /**
     * 合并任务数组
     * @param toStorageTasks 要把资源运到 storage 的任务数组
     * @param toTerminalTasks 要把资源运到终端的任务数组
     */
    private mergeTasks(
        toStorageTasks: BalanceResult<BalanceDirection.ToStorage>[],
        toTerminalTasks: BalanceResult<BalanceDirection.ToTerminal>[]
    ) {
        // 把两组任务按照任务搬运量升序排序
        const sortedToStorageTasks = _.sortBy(toStorageTasks, ({ amount }) => amount)
        const sortedToTerminalTasks = _.sortBy(toTerminalTasks, ({ amount }) => amount)

        // storage 和 terminal 哪个剩的地方大就先往哪挪，两个方向的任务交叉执行
        return this.storage.store.getFreeCapacity() > this.terminal.store.getFreeCapacity() ?
            crossMerge<BalanceResult>(sortedToStorageTasks, sortedToTerminalTasks) :
            crossMerge<BalanceResult>(sortedToTerminalTasks, sortedToStorageTasks)
    }

    /**
     * 按照平衡策略生成对应的中央物流任务
     */
    private generateCenterTask(tasks: BalanceResult[]): number[] {
        return tasks.map((task, index) => {
            const { to, from } = task.direction === BalanceDirection.ToStorage ?
                { to: CenterStructure.Storage, from: CenterStructure.Terminal } :
                { to: CenterStructure.Terminal, from: CenterStructure.Storage }
            return this.room.centerTransport.send(from, to, task.resourceType, task.amount, 'balanceTask' + index)
        })
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
        const configAmount = BALANCE_CONFIG[resourceType] || DEFAULT_BALANCE_LIMIT

        // 需要从 terminal 运到 storage
        if (terminalAmount > configAmount) {
            toStorageTasks.push({
                resourceType,
                amount: terminalAmount - configAmount,
                direction: BalanceDirection.ToStorage
            })
        }
        // 需要从 storage 运到 terminal
        else if (terminalAmount < configAmount) {
            const amount = Math.min(configAmount - terminalAmount, this.storage.store[resourceType])
            // sotrage 里没有所需的资源，无法平衡
            if (amount <= 0) return

            toTerminalTasks.push({
                resourceType,
                amount,
                direction: BalanceDirection.ToTerminal
            })
        }
    }

    /**
     * 查询房间内指定资源的数量
     * 目前会检查 storage 和 terminal 的 storage
     * 
     * @param resourceType 要查询的资源
     */
    public getResource(res: ResourceConstant): ResourceAmount {
        const storageAmount = this.storage?.store[res] || 0
        const terminalAmount = this.terminal?.store[res] || 0

        return {
            total: storageAmount + terminalAmount,
            storage: storageAmount,
            terminal: terminalAmount
        }
    }

    /**
     * 获取资源的存放处
     * 向这个方法传入资源和数量，会返回应该去 storage 还是 terminal 里取
     * 
     * @param res 要获取的资源
     * @param amount 资源类型
     */
    public getResourcePlace(res: ResourceConstant, amount: number = 1): StructureTerminal | StructureStorage | undefined {
        // 优先取用 storage 里的
        const storageAmount = this.storage?.store[res] || 0
        if (storageAmount >= amount) return this.room.storage

        const terminalAmount = this.terminal?.store[res] || 0
        if (terminalAmount === 0 && storageAmount === 0) return undefined

        // storage 里的资源不足的话就挑哪个的资源多
        return terminalAmount > storageAmount ? this.room.terminal : this.room.storage
    }
}
