import { EnvContext } from '@/utils'
import { UnitMemory } from '../unitControl'

export type TaskBaseContext<T extends RoomTask = RoomTask> = {
    /**
     * 该任务模块所控制的单位名称前缀
     * 存在多个单位时会自动在名字后面追加编号
     */
    unitName: string
    roomName: string
    getMemory: () => RoomTaskMemory<T>
    /**
     * 读取本房间单位的内存
     */
    getUnitMemory: () => Record<string, UnitMemory<TaskUnitInfo>>
    /**
     * 发布新的运维单位
     */
    releaseUnit: (creepName: string) => void
} & EnvContext

export interface RoomTaskMemory<Task = RoomTask> {
    tasks?: Task[]
    unitMax?: number
    unitMin?: number
}

/**
 * 房间任务基础信息
 * 该任务是物流任务和工作任务的基础
 */
export interface RoomTask<T = string | number> {
    /**
     * 该任务的类型
     */
    type: T,
    /**
     * 该任务的优先级
     * 若为空则按照发布顺序进行排序
     */
    priority?: number
    /**
     * 该任务的唯一索引
     */
    key?: number
    /**
     * 该任务需要多少人去做
     */
    need?: number
    /**
     * 正在处理该任务的单位人数
     */
    unit?: number
}

/**
 * 正在处理任务的 creep
 */
export interface TaskUnitInfo<CustomData = Record<string, unknown>> {
    /**
     * 该 creep 正在执行的工作
     * 没有任务时为空
     */
    doing?: number
    /**
     * 该 creep 是否被开除了
     * 当该字段为 true 时，creep 可以正常工作，但是老死之后将不会重新孵化
     */
    fired?: boolean
    /**
     * 该单位保存的自定义数据
     */
    data: CustomData
}

/**
 * 新增房间任务时的配置项
 */
export interface AddTaskOpt {
    /**
     * 发布任务后是否立刻重新调度
     */
    dispath?: boolean
}

/**
 * 更新任务时的配置项
 */
export interface UpdateTaskOpt extends AddTaskOpt {
    /**
     * 如果未发现已存在的任务的话，将新建此任务
     */
    addWhenNotFound?: boolean
}
