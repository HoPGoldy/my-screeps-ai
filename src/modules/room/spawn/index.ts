import { creepDefaultMemory, importantRoles } from './constant'
import RoomAccessor from '../RoomAccessor'
import roles from '@/role'

/**
 * 房间孵化管理模块
 * 提供了一套 api 用于管理孵化任务
 */
export default class RoomSpawnController extends RoomAccessor<string[]> {
    /**
     * 实例化房间孵化管理
     * @param roomName 要管理的房间名
     */
    constructor(roomName: string) {
        super('roomSpawn', roomName, 'spawnList', [])
    }

    /**
     * 向生产队列里推送一个生产任务
     * 
     * @param creepName 要孵化的 creep 名称，必须位于 creepConfigs 中
     * @returns 当前任务在队列中的排名
     */
    public addTask(creepName: string): number | ERR_NAME_EXISTS {
        // 先检查下任务是不是已经在队列里了
        if (!this.hasTask(creepName)) {
            // 任务加入队列
            this.memory.push(creepName)
            this.saveMemory()

            return this.memory.length - 1
        }
        // 如果已经有的话返回异常
        else return ERR_NAME_EXISTS
    }

    /**
     * 检查生产队列中是否包含指定任务
     * 
     * @param creepName 要检查的任务名
     * @returns 有则返回 true
     */
    public hasTask(creepName: string): boolean {
        return this.memory.includes(creepName)
    }

    /**
     * 清空任务队列
     * @danger 非测试情况下不要调用！
     */
    public clearTask(): void {
        Game.rooms[this.roomName][this.memoryKey] = []
    }

    /**
     * 将当前任务挂起
     * 任务会被移动至队列末尾
     */
    public hangTask(): void {
        this.memory.push(this.memory.shift())
        this.saveMemory()
    }

    /**
     * 移除第一个孵化任务
     */
    public removeCurrentTask(): void {
        this.memory.shift()
        this.saveMemory()
    }

    public runSpawn(spawn: StructureSpawn): void {
        if (spawn.spawning) {
            /**
             * 开始孵化后向物流队列推送能量填充任务
             * 
             * 不在 mySpawnCreep 返回 OK 时判断是因为：
             * 由于孵化是在 tick 末的行动执行阶段进行的，所以能量在 tick 末期才会从 extension 中扣除
             * 如果返回 OK 就推送任务的话，就会出现任务已经存在了，而 extension 还是满的
             * 而 creep 恰好就是在这段时间里执行的物流任务，就会出现如下错误逻辑：
             * mySpawnCreep 返回 OK > 推送填充任务 > creep 执行任务 > 发现能量都是满的 > **移除任务** > tick 末期开始孵化 > extension 扣除能量
             */
            if (spawn.spawning.needTime - spawn.spawning.remainingTime == 1) {
                this.room.transport.updateTask({ type: 'fillExtension', priority: 10 })
    
                if (
                    // 非战争状态下直接发布 power 填 extension 任务
                    !this.room.memory.war ||
                    // 战争模式时，剩余能量掉至 50% 以下再发布 power 任务，防止 power 效果被浪费
                    (this.room.energyAvailable / this.room.energyCapacityAvailable <= 0.5)
                ) this.room.addPowerTask(PWR_OPERATE_EXTENSION, 1)
            }
            return
        }

        // 生成中 / 生产队列为空 就啥都不干
        if (spawn.spawning || this.memory.length == 0) return 

        const task = this.memory[0]
        this.room.visual.text(`当前孵化队列 ${this.memory.join(' | ')}`, 1, 1, { align: 'left' })

        // 进行生成
        const spawnResult: MySpawnReturnCode = this.spawnCreep(spawn, task)

        // 孵化成功后移除任务
        if (spawnResult === OK) {
            this.removeCurrentTask()
            // this.log(`执行成功，移除 ${task}`)
        }
        // 能量不足就挂起任务，但是如果是重要角色的话就会卡住然后优先孵化
        else if (
            spawnResult === ERR_NOT_ENOUGH_ENERGY &&
            !importantRoles.includes(Memory.creepConfigs[task].role)
        ) this.hangTask()
    }

    /**
     * 从 spawn 生产 creep
     * 
     * @param configName 对应的配置名称
     * @returns Spawn.spawnCreep 的返回值
     */
    private spawnCreep(spawn: StructureSpawn, configName: string): MySpawnReturnCode {
        // 如果配置列表中已经找不到该 creep 的配置了 则直接移除该生成任务
        const creepConfig = Memory.creepConfigs?.[configName]
        if (!creepConfig) return OK

        // 找不到他的工作逻辑的话也直接移除任务
        const creepWork: CreepConfig<CreepRoleConstant> = roles[creepConfig.role]
        if (!creepWork) return OK

        // 设置 creep 内存
        let creepMemory: CreepMemory = _.cloneDeep(creepDefaultMemory)
        creepMemory.role = creepConfig.role
        creepMemory.data = creepConfig.data

        // 获取身体部件
        const bodys = creepWork.bodys(this.room, spawn, creepConfig.data)
        if (bodys.length <= 0) return ERR_NOT_ENOUGH_ENERGY

        const spawnResult: ScreepsReturnCode = spawn.spawnCreep(bodys, configName, {
            memory: creepMemory
        })
        this.room.visual.text(`mySpawnCreep 返回值 ${spawnResult}`, 1, 5, { align: 'left' })
        // 检查是否生成成功
        if (spawnResult == OK) {
            return OK
        }
        else if (spawnResult == ERR_NAME_EXISTS) {
            this.log(`${configName} 已经存在 ${creepConfig.spawnRoom} 将不再生成`)
            // 这里返回 ok，然后让外层方法移除对应的孵化任务
            return OK
        }
        else {
            // this.log(`生成失败, ${creepConfig.spawnRoom} 任务 ${configName} 挂起, 错误码 ${spawnResult}`, 'red')
            return spawnResult
        }
    }
}

