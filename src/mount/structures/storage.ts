import { createHelp } from 'modules/help'
import { DEFAULT_ENERGY_KEEP_AMOUNT, DEFAULT_ENERGY_KEEP_LIMIT, ENERGY_SHARE_LIMIT } from 'setting'

/**
 * Storage 拓展
 * 
 * storage 会对自己中的能量进行监控，如果大于指定量（ENERGY_SHARE_LIMIT）的话
 * 就将自己注册到资源来源表中为其他房间提供能量
 */
class StorageExtension extends StructureStorage {
    public onWork(): void {
        if (Game.time % 20) return

        this.energyKeeper()

        if (Game.time % 10000) return
        // 能量太多就提供资源共享
        if (this.store[RESOURCE_ENERGY] >= ENERGY_SHARE_LIMIT) this.room.share.becomeSource(RESOURCE_ENERGY)
    }

    /**
     * 将其他建筑物的能量维持在指定值
     */
    private energyKeeper() {
        const info = this.room.memory.energyKeepInfo
        if (!info || !info.terminal || !this.room.terminal) return

        if (
            // terminal 能量不够了
            this.room.terminal.store[RESOURCE_ENERGY] < info.terminal.amount &&
            // 自己的能量够
            this.store[RESOURCE_ENERGY] >= info.terminal.limit
        ) {
            // 发布到 terminal 的能量转移任务
            this.room.centerTransport.addTask({
                submit: STRUCTURE_FACTORY,
                source: STRUCTURE_STORAGE,
                target: STRUCTURE_TERMINAL,
                resourceType: RESOURCE_ENERGY,
                amount: info.terminal.amount - this.room.terminal.store[RESOURCE_ENERGY]
            })
        }
    }

    /**
     * 添加能量填充规则
     * 
     * @param amount 要填充的能量数量
     * @param limit 在 storage 中能量大于多少时才会填充
     */
    public addEnergyKeep(amount: number = DEFAULT_ENERGY_KEEP_AMOUNT, limit: number = DEFAULT_ENERGY_KEEP_LIMIT): OK {
        if (!this.room.memory.energyKeepInfo) this.room.memory.energyKeepInfo = {}

        this.room.memory.energyKeepInfo.terminal = { amount, limit }
        return OK
    }

    /**
     * 移除所有能量填充规则
     */
    public removeEnergyKeep(): OK {
        delete this.room.memory.energyKeepInfo
        return OK
    }

    /**
     * 建筑完成时以自己为中心发布新的 creep 运维组
     */
    public onBuildComplete(): void {
        this.room.source.forEach(source => {
            const container = source.getContainer()
            // 添加从 container 到自己的能量搬运任务
            // 虽然没指定任务完成条件，但是后面 container 是会被主动摧毁的（link 造好后），这时对应的搬运任务就会被释放掉
            // 这里不指定任务完成时间的原因是在 storage 造好后 harvester 还是会用 container 好久，这个任务要一直持续到 container 消失
            container && this.room.transport.addTask({
                type: 'transport',
                from: container.id,
                to: this.id,
                resourceType: RESOURCE_ENERGY
            })
        })
    }
}

/**
 * storage 控制台拓展
 */
class StorageConsole extends StorageExtension {
    /**
     * 新增填充规则
     */
    public addkeep(amount: number, limit: number): string {
        this.addEnergyKeep(amount, limit)

        return '添加成功，当前设置值:\n' + this.showkeep()
    }

    /**
     * 移除填充规则
     */
    public removekeep(): string {
        this.removeEnergyKeep()

        return '移除成功，当前设置值:\n' + this.showkeep()
    }

    /**
     * 显示所有填充规则
     */
    public showkeep(): string {
        const info = this.room.memory.energyKeepInfo

        if (!info) return `暂无能量填充设置`

        const logs = Object.keys(info).map(structureKey => {
            const item = info[structureKey]
            return `=> ${structureKey} 维持值: ${item.amount} 下限: ${item.limit}`
        })

        logs.unshift('[维持值] 要在指定建筑中维持多少能量 [下限] 该设置需要 storage 中能量大于多少才会触发')

        return logs.join('\n')
    }

    /**
     * 帮助信息
     */
    public help(): string {
        return createHelp({
            name: 'Storage 控制台',
            describe: '通过设置填充规则来自动向其他建筑物填充能量（目前只支持 terminal）',
            api: [
                {
                    title: '添加填充规则',
                    params: [
                        { name: 'amount', desc: `[可选] 要填充到 terminal 的能量数量，默认 ${DEFAULT_ENERGY_KEEP_AMOUNT}` },
                        { name: 'limit', desc: `[可选] storage 中的能量要大于该值时才会进行填充，默认 ${DEFAULT_ENERGY_KEEP_LIMIT}` }
                    ],
                    functionName: 'addkeep'
                },
                {
                    title: '移除填充规则',
                    describe: '该操作会自动从 storage 里取出能量',
                    functionName: 'removekeep'
                },
                {
                    title: '列出所有填充规则',
                    functionName: 'showkeep'
                },
                {
                    title: '重设默认监听',
                    params: [
                        { name: 'hard', desc: '[可选] 将移除非默认的监听任务，默认为 false' }
                    ],
                    functionName: 'reset'
                }
            ]
        })
    }
}

export { StorageExtension, StorageConsole }