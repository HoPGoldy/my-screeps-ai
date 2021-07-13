import { creepDefaultMemory, importantRoles } from './constant'
import RoomAccessor from '../RoomAccessor'
import roles from '@/role'
import RoomCreepRelease from './creepRelease'
import { updateCreepData } from '@/modulesGlobal/creep/utils'
import { MySpawnReturnCode, SpawnTask } from './types'
import { TransportTaskType } from '../taskTransport/types'

/**
 * 房间孵化管理模块
 * 提供了一套 api 用于管理孵化任务
 */
export default class RoomSpawnController extends RoomAccessor<SpawnTask[]> {
    /**
     * creep 发布接口
     */
    release: RoomCreepRelease

    /**
     * 实例化房间孵化管理
     * @param roomName 要管理的房间名
     */
    constructor(roomName: string) {
        super('roomSpawn', roomName, 'spawnList', [])
        this.release = new RoomCreepRelease(this)
    }

    /**
     * 向生产队列里推送一个生产任务
     * 
     * @param task 新的孵化任务
     * @returns 当前任务在队列中的排名
     */
    public addTask(task: SpawnTask): number | ERR_NAME_EXISTS {
        // 先检查下任务是不是已经在队列里了
        if (!this.hasTask(task.name)) {
            // 任务加入队列
            this.memory.push(task)

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
        return !!this.memory.find(({ name }) => name === creepName)
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
    }

    /**
     * 移除第一个孵化任务
     */
    public removeCurrentTask(): void {
        if (this.memory.length > 1) this.memory.shift()
        else this.memory = undefined
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
                this.room.transport.updateTask({ type: TransportTaskType.FillExtension, priority: 10 }, { dispath: true })

                if (
                    // 非战争状态下直接发布 power 填 extension 任务
                    !this.room.memory.war ||
                    // 战争模式时，剩余能量掉至 50% 以下再发布 power 任务，防止 power 效果被浪费
                    (this.room.energyAvailable / this.room.energyCapacityAvailable <= 0.5)
                ) this.room.power.addTask(PWR_OPERATE_EXTENSION, 1)
            }
            return
        }

        // 生成中 / 生产队列为空 就啥都不干
        if (spawn.spawning || this.memory.length == 0) return 

        const task = this.memory[0]
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
            !importantRoles.includes(task.role)
        ) this.hangTask()
    }

    /**
     * 从 spawn 生产 creep
     * 
     * @param spawn 要执行孵化的 spawn
     * @param task 要孵化的任务
     * @returns Spawn.spawnCreep 的返回值
     */
    private spawnCreep(spawn: StructureSpawn, { name, role, data }: SpawnTask): MySpawnReturnCode {
        // 找不到他的工作逻辑的话直接移除任务
        const creepWork: CreepConfig<CreepRoleConstant> = roles[role]
        if (!creepWork) return OK

        // 设置 creep 内存
        let memory: CreepMemory = { ...creepDefaultMemory, spawnRoom: this.room.name, role, data }

        // 获取身体部件
        const bodys = creepWork.bodys(this.room, spawn, data)
        if (bodys.length <= 0) return ERR_NOT_ENOUGH_ENERGY

        const spawnResult: ScreepsReturnCode = spawn.spawnCreep(bodys, name, { memory })
        // 检查是否生成成功
        if (spawnResult == OK) {
            return OK
        }
        else if (spawnResult == ERR_NAME_EXISTS) {
            this.log(`${name} 已经存在 ${this.roomName} 将不再生成`)
            // creep 已经存在，把数据直接更新给他
            updateCreepData(name, data)
            // 这里返回 ok，然后让外层方法移除对应的孵化任务
            return OK
        }
        else {
            // this.log(`生成失败, ${creepConfig.spawnRoom} 任务 ${configName} 挂起, 错误码 ${spawnResult}`, Color.Red)
            return spawnResult
        }
    }
}
