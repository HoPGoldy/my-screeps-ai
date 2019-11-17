import { creepConfigs } from './config'
// import { shareSetting } from './setting'

// 路径名到颜色的对应列表
const pathMap: IPathMap = {
    default: '#ffffff',
    havest: '#CCFF99',
    upgrade: '#99CCFF',
    build: '#FFCC99',
    repair: '#000099',
    attack: '#DC143C', // 猩红
    claimer: 'Indigo' //靛青
}

/**
 * 通过路径名称获取 visualizePathStyle
 * 
 * @param pathName 路径的名称
 * @returns 包含可视化路径的对象
 */
export function getPath (pathName: string='default'): MoveToOpts {
    const pathColor: string = (pathName in pathMap) ? 
        pathMap[pathName] : 
        pathMap['default']
    
    return {
        visualizePathStyle: {
            stroke: pathColor
        }
    }
}

/**
 * 死亡 creep 记忆清除
 */
export function clearDiedCreep (): boolean {
    for(const name in Memory.creeps) {
        if(!Game.creeps[name]) {
            delete Memory.creeps[name]
            console.log('清除死去蠕虫记忆', name)
        }
    }
    return true
}

/**
 * creep 数量控制器
 * 
 * 通过检查死亡 creep 的记忆来确定哪些 creep 需要重生
 * 此函数可以同时清除死去 creep 的内存
 */
export function creepNumberController (): void {
    // if (Game.time % 20) return

    for (const name in Memory.creeps) {
        // 如果 creep 已经凉了
        if (!Game.creeps[name]) {
            const role: string = Memory.creeps[name].role
            // 获取配置项
            const creepConfig: ICreepConfig = creepConfigs[role]
            if (!creepConfig) {
                console.log(`死亡 ${name} 未找到指定的 creepConfig 已删除`)
                delete Memory.creeps[name]
                return
            }

            // 检查指定的 spawn 中有没有它的生成任务
            const spawn = Game.spawns[creepConfig.spawn]
            if (!spawn) {
                console.log(`死亡 ${name} 未找到 ${creepConfig.spawn}`)
                return
            }
            // 没有的话加入生成
            if (!spawn.hasTask(role)) {
                spawn.addTask(role)
                // console.log(`将 ${role} 加入 ${creepConfig.spawn} 生成队列`)
            }
            // 有的话删除过期内存
            else {
                delete Memory.creeps[name]
                // console.log('清除死去 creep 记忆', name)
            }
        }
    }
}

/**
 * 资源共享协议控制器
 * 该函数操控了房间间的资源共享任务
 */
export function shareController(): void {
    // 没到执行时间就跳过
    if (Game.time % 15) return 

    // 先检查有没有所需的数据对象
    if (!Memory.roomShare) Memory.roomShare = {
        tasks: [],
        taskIndex: 0
    }
    // 获取要检查的任务
    const task = shareUtils.getTaskByIndex()
    if (!task) return 

    // 源房间没有视野或者没有终端，跳过检查
    const sourceRoom = Game.rooms[task.source]
    if (!sourceRoom || !sourceRoom.terminal) {
        console.log(`[资源共享] 未找到 ${task.source} 或其终端`)
        shareUtils.setNextIndex()
        return 
    }

    const roomTask = shareUtils.checkTask(task)
    if (!roomTask) {
        // console.log(`[共享任务] ${task.source} > ${task.target} 资源: ${task.resourceType} 维持数量 ${task.amount} 不需要执行`)
        shareUtils.setNextIndex()
        return
    }
    
    // console.log(`[共享任务] ${task.source} > ${task.target} 资源: ${task.resourceType} 维持数量 ${task.amount} 需要执行！`)
    const sendResult = shareUtils.sendRoomTask(sourceRoom, roomTask)
    // console.log(sendResult ? '任务发送成功！' : '该房间尚在执行共享任务')
    shareUtils.setNextIndex()
}

/**
 * 资源共享控制器所需的工具集合对象
 */
const shareUtils = {
    /**
     * 检查当前任务是否需要执行
     * 注意：资源共享任务必须保证拥有 source 房间的视野
     * 并且当 source 房间没有视野时，则会跳过检查直接通知需要执行任务
     * 
     * @param task 要检查的资源共享任务
     * @returns 需要执行任务则返回具体任务，不需要则返回 null
     */
    checkTask(task: IShareTask): IRoomShareTask | null {
        // 目标房间没视野，直接通知处理
        const targetRoom = Game.rooms[task.target]
        if (!targetRoom) return {
            target: task.target,
            resourceType: task.resourceType,
            amount: task.amount
        }

        // 目标房间没有终端，不执行任务
        const targetTerminal = targetRoom.terminal
        if (!targetTerminal) {
            console.log(`[资源共享] 未找到 ${task.target} 的终端`)
            return null
        }

        // 目标房间资源不足，准备发送任务
        if (targetTerminal.store[task.resourceType] < task.amount) return {
            target: task.target,
            resourceType: task.resourceType,
            amount: task.amount - targetTerminal.store[task.resourceType]
        }
        // 一切良好，不需要发送任务
        else return null
    },

    /**
     * 向指定房间发送共享任务
     * 
     * @param sourceRoom 要执行任务的房间
     * @param task 房间要执行的共享任务
     * @returns 该房间当前没有共享任务则返回 true，在处理其他的共享任务则返回 false
     */
    sendRoomTask(sourceRoom: Room, task: IRoomShareTask): boolean {
        // 该房间还在执行其他共享任务
        if (sourceRoom.memory.shareTask) return false

        sourceRoom.memory.shareTask = task
        return true
    },

    /**
     * 将资源共享任务指针指向下一个任务
     */
    setNextIndex(): void {
        let index = Memory.roomShare.taskIndex | 0
        const tasksLength = Memory.roomShare.tasks.length
        // 循环设置索引
        Memory.roomShare.taskIndex = (index + 1 >= tasksLength) ? 0 : index + 1
    },

    /**
     * 通过资源共享指针获取当前要处理的任务
     */
    getTaskByIndex(): IShareTask | null {
        const taskId = Memory.roomShare.taskIndex
        // 索引超出限制则返回空
        if (Memory.roomShare.tasks.length < taskId) return null

        return Memory.roomShare.tasks[taskId]
    }
}

/**
 * 执行 Hash Map 中子元素对象的 work 方法
 * 
 * @param hashMap 游戏对象的 hash map。如 Game.creeps、Game.spawns 等
 */
export function doing(hashMap: object): void {
    Object.values(hashMap).forEach(item => {
        // let cost1: number
        // let cost2: number
        // if (item.structureType === STRUCTURE_TOWER) cost1 = Game.cpu.getUsed()
        if (item.work) item.work()
        // if (item.structureType === STRUCTURE_TOWER) {
        //     cost2 = Game.cpu.getUsed()
        //     console.log(`建筑 ${item} 消耗 cpu ${cost2 - cost1}`)
        // }
    })
}

/**
 * 显示指定函数的 cpu 消耗
 * @param func 要检查消耗 cpu 的函数
 */
export function checkCPU(func: Function): void {
    const cost1 = Game.cpu.getUsed()
    func()
    const cost2 = Game.cpu.getUsed()
}

/**
 * 给指定文本添加颜色
 * 
 * @param content 要添加颜色的文本
 * @param color 要添加的颜色
 */
export function colorful(content: string, color: string): string {
    return `<text style="color: ${color}">${content}</text>`
}

/**
 * 给函数的显示添加一点小细节
 * 只会用在各种 help 方法中
 * 
 * @param functionInfo 函数的信息
 */
export function createHelp(functionInfo: IFunctionDescribe[]): string {
    const functionList = functionInfo.map(func => {
        // 标题
        const title = colorful(func.title, '#6b9955')
        // 参数介绍
        const param = func.params ? 
            func.params.map(param => `  - ${colorful(param.name, '#8dc5e3')}: ${colorful(param.desc, '#6b9955')}`).join('\n') : ''
        // 函数示例中的参数
        const paramInFunc = func.params ? 
            func.params.map(param => colorful(param.name, '#8dc5e3')).join(', ') : ''
        // 函数示例
        const functionName = `${colorful(func.functionName, '#c5c599')}(${paramInFunc})`

        return func.params ? `${title}\n${param}\n${functionName}\n` : `${title}\n${functionName}\n`
    })
    
    return functionList.join('\n')
}