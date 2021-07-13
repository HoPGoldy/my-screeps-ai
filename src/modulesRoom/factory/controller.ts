import { Color, colorful } from '@/modulesGlobal';
import FactoryBase from './base';
import { FactoryState, InteractAction, TOP_TARGET } from './constant';
import StageGetResource from './stageGetResource';
import StagePrepare from './stagePrepare';
import StagePutResource from './stagePutResource';
import StageWorking from './stageWorking';

/**
 * 阶段构造器
 */
type StageConstructors = {
    [state in FactoryState]: new (roomName: string) => { run: () => void }
}


type FactoryStages = {
    [state in FactoryState]?: { run: () => void }
}

/**
 * 所有工作阶段
 */
const stageConstructors: StageConstructors = {
    [FactoryState.Prepare]: StagePrepare,
    [FactoryState.GetResource]: StageGetResource,
    [FactoryState.Working]: StageWorking,
    [FactoryState.PutResource]: StagePutResource
}

export default class RoomFactoryController extends FactoryBase {
    /**
     * 工厂所有的工作阶段
     */
    private stages: FactoryStages = {}

    constructor(roomName: string) {
        super(roomName)
    }

    /**
     * 工厂执行工作入口
     */
    public runFactory(): void {
        // 没有启用或没有 factory 则跳过
        if (!this.memory || !this.room[STRUCTURE_FACTORY]) return
    
        const { state, sleep, pause } = this.memory
        // 暂停了，跳过
        if (pause) return

        // 检查工厂是否在休眠
        if (sleep) {
            if (Game.time > sleep) this.wakeup()
            else return
        }

        // 执行工作，这里对阶段进行了懒加载
        if (!this.stages[state]) this.stages[state] = new stageConstructors[state](this.roomName)
        this.stages[state].run()
    }

    /**
     * 设置工厂等级
     * 
     * @param level 等级
     * @returns ERR_INVALID_ARGS 生产线类型异常或者等级小于 1 或者大于 5
     * @returns ERR_NAME_EXISTS 工厂已经被 Power 强化，无法修改等级
     */
    public setLevel(level: 1 | 2 | 3 | 4 | 5): OK | ERR_INVALID_ARGS | ERR_NAME_EXISTS {
        if (!this.memory) this.initMemory()

        // 等级异常就返回错误
        if (level > 5 || level < 1) return ERR_INVALID_ARGS

        // 已经被 power 强化并且等级不符，无法设置等级
        if (
            this.factory.effects &&
            this.factory.effects[PWR_OPERATE_FACTORY] &&
            (this.factory.effects[PWR_OPERATE_FACTORY] as PowerEffect).level !== level
        ) return ERR_NAME_EXISTS

        // 如果之前注册过的话，就取消注册
        if (!_.isUndefined(this.memory.level)) {
            this.interactWithOutside(InteractAction.Unregister, this.memory.depositTypes, this.memory.level)
        }

        // 注册新的共享协议
        this.interactWithOutside(InteractAction.Register, this.memory.depositTypes, level)

        // 更新内存属性
        this.memory.level = level
        return OK
    }

    /**
     * 设置生产线
     * 可以指定多个，会直接覆盖之前的配置，所以需要包含所有要进行的生产线类别
     * @param depositTypes 要生成的生产线类型
     * @returns ERR_INVALID_TARGET 尚未等级工厂等级
     */
    public setChain(...depositTypes: DepositConstant[]): ERR_INVALID_TARGET | OK {
        if (!this.memory || !this.memory.level) return ERR_INVALID_TARGET
        
        // 移除老的注册
        this.interactWithOutside(InteractAction.Unregister, this.memory.depositTypes, this.memory.level)
        // 进行新的注册
        this.interactWithOutside(InteractAction.Register, depositTypes, this.memory.level)
        
        this.memory.depositTypes = depositTypes
        return OK
    }

    /**
     * 与外界交互
     * 包含了对 Memory.commodities 和资源共享协议的注册与取消注册
     * 
     * @param action register 执行注册，unregister 取消注册
     * @param depositTypes 生产线类型，可以为 undefined
     * @param level 工厂等级
     */
    private interactWithOutside(action: InteractAction, depositTypes: DepositConstant[], level: 1 | 2 | 3 | 4 | 5) {
        // 兜个底
        if (!Memory.commodities) Memory.commodities = { 1: [], 2: [], 3: [], 4: [], 5: [] }
        // 与 Memory.commodities 交互
        if (action === InteractAction.Register) Memory.commodities[level].push(this.room.name)
        else _.pull(Memory.commodities[level], this.room.name)
        
        // 与资源共享协议交互
        depositTypes = depositTypes || []
        depositTypes.forEach(type => {
            TOP_TARGET[type][level].forEach(resType => {
                if (action === InteractAction.Register) this.room.share.becomeSource(resType)
                else this.room.share.leaveSource(resType)
            })
        })
    }

    /**
     * 移除当前工厂配置
     * 工厂将进入闲置状态并净空存储
     */
    public remove(): OK | ERR_NOT_FOUND {
        if (!this.memory) return ERR_NOT_FOUND

        // 进入废弃进程
        this.memory.remove = true
        // 置为移出资源阶段
        this.memory.state = FactoryState.PutResource
        // 移除队列中的后续任务
        const task = this.getCurrentTask()
        this.memory.taskList = [ task ]

        return OK 
    }

    /**
     * 初始化工厂内存
     */
    public initMemory(): void {
        this.memory = {
            targetIndex: 0,
            state: FactoryState.Prepare,
            taskList: []
        }
    }

    /**
     * 输出当前工厂的状态
     */
    public stats(): string {
        if (!this.memory) return `[${this.room.name} factory] 工厂未启用`
        const memory = this.memory

        const workStats = memory.pause ? colorful('[暂停中]', Color.Yellow) :
        memory.sleep ? colorful(`[${memory.sleepReason} 休眠中 剩余${memory.sleep - Game.time}t]`, Color.Yellow) : colorful('工作中', Color.Green)

        // 自己加入的生产线
        const joinedChain = memory.depositTypes ? memory.depositTypes.join(', ') : '未指定'

        // 工厂基本信息
        let logs = [
            `生产线类型: ${joinedChain} 工厂等级: ${memory.level || '未指定'} ${memory.specialTraget ? '持续生产：' + memory.specialTraget : ''}`,
            `生产状态: ${workStats} 当前工作阶段: ${memory.state}`,
            `现存任务数量: ${memory.taskList.length} 任务队列详情:`
        ]

        // 工厂任务队列详情
        if (memory.taskList.length <= 0) logs.push('无任务')
        else logs.push(...memory.taskList.map((task, index) => `  - [任务 ${index}] 任务目标: ${task.target} 任务数量: ${task.amount}`))
        
        // 组装返回
        return logs.join('\n')
    }
}

