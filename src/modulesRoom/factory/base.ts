import { FactoryMemory } from './types';
import RoomAccessor from '../RoomAccessor';
import { FactoryState, TOP_TARGET, BLACK_LIST, COMMODITY_MAX, FACTORY_LOCK_AMOUNT } from './constant';
import { FactoryTask } from './types';

/**
 * 工厂基础管理 api
 */
export default class FactoryBase extends RoomAccessor<FactoryMemory> {
    constructor(roomName: string) {
        super('factory', roomName, 'factory', undefined)
    }

    /**
     * 快捷访问 - 本房价内工厂
     */
    get factory() {
        return this.room[STRUCTURE_FACTORY]
    }

    /**
     * 进入待机状态
     * 
     * @param time 待机的时长
     * @param reason 待机的理由
     */
    public gotoBed(time: number, reason: string): OK | ERR_NOT_FOUND {
        if (!this.memory) return ERR_NOT_FOUND

        this.memory.sleep = Game.time + time
        this.memory.sleepReason = reason
        return OK
    }

    /**
     * 从休眠中唤醒
     */
    public wakeup(): OK | ERR_NOT_FOUND{
        if (!this.memory) return ERR_NOT_FOUND

        delete this.memory.sleep
        delete this.memory.sleepReason
    }

    /**
     * 计算合成指定目标产物需要多少材料
     * 没有对对应关系进行验证，请保证产物和材料之间存在合成关系
     * 
     * @param targetResource 要合成的目标产物类型
     * @param targetAmount 要合成的目标产物数量
     * @param subResource 要查询的合成材料类型
     */
    protected clacSubResourceAmount(targetResource: CommodityConstant, targetAmount: number, subResource: ResourceConstant): number {
        const subResources = COMMODITIES[targetResource].components
        // 目标数量除于单次合成数量，向上取整后乘以单次合成所需的材料数量
        return subResources[subResource] * Math.ceil(targetAmount / COMMODITIES[targetResource].amount)
    }

    /**
     * 检查资源是否位于黑名单中
     * 
     * 因为有些基础资源也是有合成任务的，而自动任务规划里就需要避开这些任务
     * 不然就会自动拆分出很多重复的任务，比如：发现需要能量 > 添加电池合成任务 > 添加能量合成任务 > ...
     */
    protected inBlacklist(resType: ResourceConstant): boolean {
        return BLACK_LIST.includes(resType as MineralConstant) || !(resType in COMMODITIES)
    }

    /**
     * 处理数量不足的资源
     * 如果该资源自己可以合成的话，就会自动添加新任务
     * 
     * @param resType 数量不足的资源
     * @param amount 需要的数量
     */
    protected handleInsufficientResource(resType: ResourceConstant, amount: number) {
        // 如果自己的等级无法合成该产品
        if ('level' in COMMODITIES[resType] && COMMODITIES[resType].level !== this.memory.level) {
            const requestAmount = amount - this.room.terminal.store[resType]
            // 请求其他房间共享
            this.room.share.request(resType as CommodityConstant, requestAmount)

            // 如果这时候只有这一个任务了，就进入待机状态
            if (this.memory.taskList.length <= 1) this.gotoBed(50, `等待共享 ${resType}*${requestAmount}`)
        }
        // 能合成的话就添加新任务，数量为需要数量 - 已存在数量
        else this.addTask({
            target: resType as CommodityConstant,
            amount: amount - this.room.terminal.store[resType]
        })
    }

    /**
     * 获取当前合成任务
     */
    protected getCurrentTask(): FactoryTask | undefined {
        return this.memory.taskList[0]
    }

    /**
     * 移除当前任务
     * 任务完成或者出错时调用
     */
    protected deleteCurrentTask(): void {
        this.memory.taskList.shift()
    }

    /**
     * 添加新的合成任务
     * 该方法会自行决策应该合成什么顶级产物
     * 
     * @param task 如果指定则将其添加为新任务，否则新增顶级产物合成任务
     * @returns 新任务在队列中的位置，第一个为 1
     */
    protected addTask(task: FactoryTask = undefined): number {
        if (task) return this.memory.taskList.push(task)

        // 如果有用户指定的目标的话就直接生成
        if (this.memory.specialTraget) {
            // 如果有生产限制的话，会先检查资源底物是否充足
            if (this.memory.specialTraget in FACTORY_LOCK_AMOUNT) {
                const subResLimit = FACTORY_LOCK_AMOUNT[this.memory.specialTraget]
                const { total } = this.room.myStorage.getResource(subResLimit.sub)
                // 如果对应底物的数量小于需要的数量的话就不会添加新任务
                if (total < subResLimit.limit) return 0
            }

            // 添加用户指定的新任务
            return this.memory.taskList.push({
                target: this.memory.specialTraget,
                amount: 2
            })
        }

        const shareTask = this.room.memory.shareTask
        // 遍历自己内存中的所有生产线类型，从 factoryTopTargets 取出对应的顶级产物，然后展平为一维数组
        const depositTypes = this.memory.depositTypes || []
        const topTargets: CommodityConstant[] = _.flatten(depositTypes.map(type => TOP_TARGET[type][this.memory.level]))
        
        // 如果房间有共享任务并且任务目标需要自己生产的话
        if (shareTask && topTargets.includes(shareTask.resourceType as CommodityConstant)) {
            // 将其添加为新任务
            return this.memory.taskList.push({
                target: shareTask.resourceType as CommodityConstant,
                amount: shareTask.amount
            })
        }

        // 没有共享任务的话就按顺序挑选
        // 索引兜底
        if (!this.memory.targetIndex || this.memory.targetIndex >= topTargets.length) {
            this.memory.targetIndex = 0
        }
        
        // 获取预定目标
        let topTarget = topTargets[this.memory.targetIndex]

        // 如果该顶级产物存在并已经超过最大生产上限，则遍历检查是否有未到上限的
        if (this.room.terminal && topTarget in COMMODITY_MAX && this.room.terminal.store[topTarget] >= COMMODITY_MAX[topTarget]) {
            let targetIndex = 0
            // 修正预定目标
            topTarget = topTargets.find((res, index) => {
                if (this.room.terminal.store[res] >= COMMODITY_MAX[res]) return false
                else {
                    targetIndex = index
                    return true
                }
            })
            
            // 遍历了还没找到的话就休眠
            if (!topTarget) {
                this.gotoBed(100, '达到上限')
                return 0
            }
            // 找到了，按照其索引更新下次预定索引
            else this.room.memory.factory.targetIndex = (targetIndex + 1 >= topTargets.length) ?
                0 : targetIndex + 1
        }
        // 没有到达上限，按原计划更新索引
        else this.memory.targetIndex = this.memory.targetIndex + 1 % topTargets.length

        if (!topTarget) return 0
        // 添加任务，一次只合成两个顶级产物
        return this.memory.taskList.push({
            target: topTarget,
            amount: 2
        })
    }

    /**
     * 挂起合成任务
     * 在任务无法进行时调用，将会把任务移动至队列末尾
     */
    protected hangTask(): void {
        this.memory.taskList.push(this.memory.taskList.shift())
    }

    /**
     * 危险 - 清空当前任务队列
     */
    public clearTask(): void {
        this.memory.taskList = []
    }

    /**
     * 设置工厂工作状态
     */
    protected setState(newState: FactoryState): void {
        this.memory.state = newState
    }
}
