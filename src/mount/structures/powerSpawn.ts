import { POWER_PROCESS_ENERGY_LIMIT } from '@/setting'
import { Color, colorful, createHelp, createRoomLink } from '@/modulesGlobal/console'
import { TransportTaskType } from '@/modulesRoom'

/**
 * PowerSpawn 拓展
 * ps 的主要任务就是 processPower，一旦 ps 启动之后，他会每隔一段时间对自己存储进行检查
 * 发现自己资源不足，就会发起向自己运输资源的物流任务。
 *
 * 可以随时通过原型上的指定方法来暂停/重启 ps，详见 .help()
 */
export class PowerSpawnExtension extends StructurePowerSpawn {
    public onWork (): void {
        // ps 未启用或者被暂停了就跳过
        if (this.room.memory.pausePS) return

        // 处理 power
        this.processPower()

        // 剩余 power 不足且 terminal 内 power 充足
        if (!this.keepResource(RESOURCE_POWER, 10, 0, 100)) return
        // 剩余energy 不足且 storage 内 energy 充足
        this.keepResource(RESOURCE_ENERGY, 1000, POWER_PROCESS_ENERGY_LIMIT, 500)
    }

    /**
     * 将自身存储的资源维持在指定容量之上
     *
     * @param resource 要检查的资源
     * @param needFillLimit 当资源余量少于该值时会发布搬运任务
     * @param sourceLimit 资源来源建筑中剩余目标资源最小值（低于该值将不会发布资源获取任务）
     * @param amount 要转移的话每次转移多少数量
     * @returns 该资源是否足够
     */
    private keepResource (resType: ResourceConstant, needFillLimit: number, sourceLimit: number, amount: number): boolean {
        if (this.store[resType] >= needFillLimit) return true

        const { total } = this.room.myStorage.getResource(resType)

        if (total > sourceLimit &&
            !this.room.transport.hasTaskWithType(TransportTaskType.FillPowerSpawn)
        ) {
            this.room.transport.addTask({
                type: TransportTaskType.FillPowerSpawn,
                requests: [{ resType, amount: Math.min(amount, total), to: this.id }]
            })
        }

        return false
    }
}

export class PowerSpawnConsole extends PowerSpawnExtension {
    /**
     * 用户操作 - 启动 powerSpawn
     * 虽然默认情况下 ps 就是会自动消化 power 的，但是执行了本方法之后，本 ps 就可以从其他房间中自动的调配 power 进行消化。
     */
    public on (): string {
        delete this.room.memory.pausePS

        // 把自己注册到全局的启用 ps 列表
        if (!Memory.psRooms) Memory.psRooms = []
        Memory.psRooms = _.uniq([...Memory.psRooms, this.room.name])

        return `[${this.room.name} PowerSpawn] 已启动 process power`
    }

    /**
     * 用户操作 - 关闭 powerSpawn
     */
    public off (): string {
        this.room.memory.pausePS = true

        // 把自己从全局启用 ps 列表中移除
        if (Memory.psRooms) {
            Memory.psRooms = _.difference(Memory.psRooms, [this.room.name])
            if (Memory.psRooms.length <= 0) delete Memory.psRooms
        }

        return `[${this.room.name} PowerSpawn] 已暂停 process power`
    }

    /**
     * 用户操作 - 查看 ps 运行状态
     */
    public stats (): string {
        const stats = []
        // 生成状态
        const working = this.store[RESOURCE_POWER] > 1 && this.store[RESOURCE_ENERGY] > 50
        const prefix = [
            colorful('●', working ? Color.Green : Color.Yellow, true),
            createRoomLink(this.room.name),
            colorful(working ? '工作中' : '等待资源中', working ? Color.Green : Color.Yellow)
        ].join(' ')

        // 统计 powerSpawn、storage、terminal 的状态
        stats.push(`${prefix} POWER: ${this.store[RESOURCE_POWER]}/${POWER_SPAWN_POWER_CAPACITY} ENERGY: ${this.store[RESOURCE_ENERGY]}/${POWER_SPAWN_ENERGY_CAPACITY}`)
        stats.push(this.room.storage ? `Storage energy: ${this.room.storage.store[RESOURCE_ENERGY]}` : 'Storage X')
        stats.push(this.room.terminal ? `Terminal power: ${this.room.terminal.store[RESOURCE_POWER]}` : 'Terminal X')

        return stats.join(' || ')
    }

    /**
     * 用户操作 - 帮助信息
     */
    public help (): string {
        return createHelp({
            name: 'PowerSpawn 控制台',
            describe: `ps 默认不启用，执行 ${colorful('.on', Color.Yellow)}() 方法会启用 ps。启用之后会进行 power 自动平衡。`,
            api: [
                {
                    title: '启动/恢复处理 power',
                    functionName: 'on'
                },
                {
                    title: '暂停处理 power',
                    functionName: 'off'
                },
                {
                    title: '查看当前状态',
                    functionName: 'stats'
                }
            ]
        })
    }
}
