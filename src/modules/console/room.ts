import { createHelp } from "./utils"
import { DEFAULT_FLAG_NAME } from "setting"

export default class Help extends Room {
    /**
     * 用户操作：addCenterTask - 添加中央运输任务
     * 
     * @param targetId 资源存放建筑类型
     * @param sourceId 资源来源建筑类型
     * @param resourceType 要转移的资源类型
     * @param amount 资源数量
     */
    public ctadd(target: CenterStructures, source: CenterStructures, resourceType: ResourceConstant, amount: number): string {
        if (!this.memory.centerTransferTasks) this.memory.centerTransferTasks = []
        const addResult = this.addCenterTask({
            submit: this.memory.centerTransferTasks.length,
            target,
            source,
            resourceType,
            amount
        })
        return `已向 ${this.name} 中央任务队列推送任务，当前排队位置: ${addResult}`
    }

    /**
     * 用户操作：将能量从 storage 转移至 terminal 里
     * 
     * @param amount 要转移的能量数量, 默认 100k
     */
    public pute(amount: number = 100000): string {
        const addResult = this.addCenterTask({
            submit: this.memory.centerTransferTasks.length,
            target: STRUCTURE_TERMINAL,
            source: STRUCTURE_STORAGE,
            resourceType: RESOURCE_ENERGY,
            amount
        })
        return `已向 ${this.name} 中央任务队列推送能量转移任务，storage > terminal, 数量 ${amount}，当前排队位置: ${addResult}`
    }

    /**
     * 用户操作：将能量从 terminal 转移至 storage 里
     * 
     * @param amount 要转移的能量数量, 默认全部转回来
     */
    public gete(amount: number = null): string {
        if (!this.terminal) return `未找到 ${this.name} 中的终端`
        if (amount === null) amount = this.terminal.store[RESOURCE_ENERGY]
        
        const addResult = this.addCenterTask({
            submit: this.memory.centerTransferTasks.length,
            target: STRUCTURE_STORAGE,
            source: STRUCTURE_TERMINAL,
            resourceType: RESOURCE_ENERGY,
            amount
        })
        return `已向 ${this.name} 中央任务队列推送能量转移任务，terminal > storage, 数量 ${amount}，当前排队位置: ${addResult}`
    }

    /**
     * 用户操作：向指定房间发送能量
     * 注意，该操作会自动从 storage 里取出能量
     * 
     * @param roomName 目标房间名
     * @param amount 要发送的数量, 默认 100k
     */
    public givee(roomName: string, amount: number = 100000): string {
        const logs = []
        if (!this.terminal) return `[能量共享] 未发现 Terminal，共享终止`
        // 如果在执行其他任务则将其覆盖，因为相对于用户操作来说，其他模块发布的资源共享任务优先级肯定要低
        // 并且其他模块的共享任务就算被删除了，过一段时间之后它也会再次发布并重新添加
        if (this.memory.shareTask) {
            const task = this.memory.shareTask
            logs.push(`┖─ 因此移除的共享任务为: 目标房间：${task.target} 资源类型：${task.resourceType} 资源总量：${task.amount}`)
        }

        // 计算路费，防止出现路费 + 资源超过终端上限的问题出现
        const cost = Game.market.calcTransactionCost(amount, this.name, roomName)
        if (amount + cost - this.terminal.store[RESOURCE_ENERGY] > this.terminal.store.getFreeCapacity()) {
            return `[能量共享] 添加共享任务失败，资源总量超出终端上限：发送数量(${amount}) + 路费(${cost}) = ${amount + cost} Terminal 剩余容量 ${this.terminal.store.getFreeCapacity()}`
        }

        this.memory.shareTask = {
            target: roomName,
            amount,
            resourceType: RESOURCE_ENERGY
        }

        logs.unshift(`[能量共享] 任务已添加，移交终端处理：房间名：${roomName} 共享数量：${amount} 路费：${cost}`)

        return logs.join('\n')
    }

        /**
     * 用户操作 - 发送 power 到指定房间
     * 
     * @param RoomName 要发送到的房间名
     * @param amount 发送的数量
     */
    public givep(RoomName: string, amount: number = 5000) {
        return this.giver(RoomName, RESOURCE_POWER, amount)
    }

    /**
     * 用户操作 - 成交订单
     * 
     * @param id 交易的订单 id
     * @param amount 交易的数量，默认为最大值
     */
    public deal(id: string, amount: number): string {
        if (!amount) {
            const order = Game.market.getOrderById(id)
            if (!order) return `[${this.name}] 订单 ${id} 不存在`

            amount = order.amount
        }

        const actionResult = Game.market.deal(id, amount, this.name)

        if (actionResult === OK) return `[${this.name}] 交易成功`
        else return `[${this.name}] 交易异常，Game.market.deal 返回值 ${actionResult}`
    }

    /**
     * 用户操作：向指定房间发送资源
     * 注意，请保证资源就在 Terminal 中
     * 
     * @param roomName 目标房间名
     * @param resourceType 要共享的资源类型
     * @param amount 要发送的数量, 默认 100k
     */
    public giver(roomName: string, resourceType: ResourceConstant, amount: number = 1000): string {
        const logs = []
        // 如果在执行其他任务则将其覆盖，因为相对于用户操作来说，其他模块发布的资源共享任务优先级肯定要低
        // 并且其他模块的共享任务就算被删除了，过一段时间之后它也会再次发布并重新添加
        if (this.memory.shareTask) {
            const task = this.memory.shareTask
            logs.push(`┖─ 因此移除的共享任务为: 目标房间：${task.target} 资源类型：${task.resourceType} 资源总量：${task.amount}`)
        }

        // 检查资源是否足够
        if (!this.terminal) return `[资源共享] 该房间没有终端`
        const resourceAmount = this.terminal.store[resourceType]
        if (! resourceAmount || resourceAmount < amount) return `[资源共享] 数量不足 ${resourceType} 剩余 ${resourceAmount | 0}`

        // 计算路费，防止出现路费 + 资源超过终端上限的问题出现
        const cost = Game.market.calcTransactionCost(amount, this.name, roomName)
        if (amount + cost > TERMINAL_CAPACITY) {
            return `[资源共享] 添加共享任务失败，资源总量超出终端上限：发送数量(${amount}) + 路费(${cost}) = ${amount + cost}`
        }

        this.memory.shareTask = {
            target: roomName,
            amount,
            resourceType
        }

        logs.unshift(`[资源共享] 任务已添加，移交终端处理：房间名：${roomName} 共享数量：${amount} 路费：${cost}`)

        return logs.join('\n')
    }
    
    /**
     * 用户操作 - 房间操作帮助
     */
    public help(): string {
        const moduleList: ModuleDescribe[] = [
            {
                name: '资源调配 API',
                describe: '用于介入房间内部的资源流转或者向其他房间调配资源',
                api: [
                    {
                        title: '添加中央运输任务',
                        params: [
                            { name: 'targetType', desc: '资源存放建筑类型，STRUCTURE_FACTORY STRUCTURE_STORAGE STRUCTURE_TERMINAL 之一' },
                            { name: 'sourceType', desc: '资源来源建筑类型，同上' },
                            { name: 'resourceType', desc: '要转移的资源类型' },
                            { name: 'amount', desc: '要转移的数量' },
                        ],
                        functionName: 'ctadd'
                    },
                    {
                        title: '发送能量',
                        describe: '该操作会自动从 storage 里取出能量',
                        params: [
                            { name: 'roomName', desc: '要发送到的房间名' },
                            { name: 'amount', desc: '[可选] 要转移的能量数量, 默认 100k' }
                        ],
                        functionName: 'givee'
                    },
                    {
                        title: '发送资源',
                        params: [
                            { name: 'roomName', desc: '要发送到的房间名' },
                            { name: 'resourceType', desc: '要发送的资源类型' },
                            { name: 'amount', desc: '[可选] 要转移的能量数量, 默认 1k' }
                        ],
                        functionName: 'giver'
                    },
                    {
                        title: '移出能量',
                        describe: '将能量从 storage 转移至 terminal 里',
                        params: [
                            { name: 'amount', desc: '[可选] 要转移的能量数量, 默认 100k' }
                        ],
                        functionName: 'pute'
                    },
                    {
                        title: '移入能量',
                        describe: '将能量从 terminal 转移至 storage 里',
                        params: [
                            { name: 'amount', desc: '[可选] 要转移的能量数量, 默认 100k' }
                        ],
                        functionName: 'gete'
                    },
                    {
                        title: '新增 BUY 单',
                        describe: '订单的交易房为本房间',
                        params: [
                            { name: 'resourceType', desc: '要购买的资源类型' },
                            { name: 'price', desc: '单价' },
                            { name: 'totalAmount', desc: '总量' },
                        ],
                        functionName: 'buy'
                    },
                    {
                        title: '新增 SELL 单',
                        describe: '订单的交易房为本房间',
                        params: [
                            { name: 'resourceType', desc: '要卖出的资源类型' },
                            { name: 'price', desc: '单价' },
                            { name: 'totalAmount', desc: '总量' },
                        ],
                        functionName: 'sell'
                    },
                    {
                        title: '拍下订单',
                        params: [
                            { name: 'id', desc: '订单 id' },
                            { name: 'amount', desc: '[可选] 交易数量，默认为全部' }
                        ],
                        functionName: 'deal'
                    },
                ]
            },
            {
                name: '建筑管控 API',
                describe: '用于管理房间中的建筑集群，部分 API 继承自对应建筑原型。',
                api: [
                    {
                        title: '工厂状态',
                        describe: 'factory.stats 的别名',
                        functionName: 'fs'
                    },
                    {
                        title: '添加终端任务',
                        describe: 'terminal.add 的别名',
                        functionName: 'ta'
                    },
                    {
                        title: '移除终端任务',
                        describe: 'terminal.remove 的别名',
                        functionName: 'tr'
                    },
                    {
                        title: '显示终端任务',
                        describe: 'terminal.show 的别名',
                        functionName: 'ts'
                    },
                    {
                        title: '初始化 lab 集群',
                        functionName: 'linit'
                    },
                    {
                        title: '暂停 lab 集群',
                        functionName: 'loff'
                    },
                    {
                        title: '重启 lab 集群',
                        functionName: 'lon'
                    },
                    {
                        title: '显示 lab 集群状态',
                        functionName: 'lshow'
                    }
                ]
            },
            {
                name: '房间拓展 API',
                describe: '用于执行本房间的对外扩张计划',
                api: [
                    {
                        title: '拓展新外矿',
                        params: [
                            { name: 'remoteRoomName', desc: '要拓展的外矿房间名' },
                            { name: 'targetId', desc: '能量应搬运到哪个建筑的 id' }
                        ],
                        functionName: 'radd'
                    },
                    {
                        title: '移除外矿',
                        params: [
                            { name: 'remoteRoomName', desc: '要移除的外矿房间名' },
                            { name: 'removeFlag', desc: '是否顺便把外矿 source 上的旗帜也移除了' }
                        ],
                        functionName: 'rremove'
                    },
                    {
                        title: '占领新房间',
                        params: [
                            { name: 'targetRoomName', desc: '要占领的房间名' },
                            { name: 'signText', desc: '[可选] 新房间的签名，默认为空' },
                        ],
                        functionName: 'claim'
                    }
                ]
            },
            {
                name: '房间管理 API',
                describe: '包含本房间的一些基础接口，本模块的大多数 API 都已实现自动调用，除非房间运转出现问题，否则不需要手动进行调用。',
                api: [
                    {
                        title: '发布 creep',
                        describe: '发布房间运营需要的角色，已自动化',
                        params: [
                            { name: 'roleName', desc: 'BaseRoleConstant 和 AdvancedRoleConstant 中的所有角色名 (定义于 index.d.ts 中)' }
                        ],
                        functionName: 'releaseCreep'
                    },
                    {
                        title: '运行建筑布局',
                        describe: '本方法依赖于 setcenter 方法，已自动化，默认在 controller 升级时调用',
                        functionName: 'planLayout'
                    },
                    {
                        title: '设置基地中心点',
                        describe: '运行建筑自动布局依赖于本方法，已自动化，在 claim 新房间后会自动设置',
                        params: [
                            { name: 'flagName', desc: '中心点上的 flag 名称' }
                        ],
                        functionName: 'setcenter'
                    },
                    {
                        title: '移除墙壁',
                        describe: '移除本房间中所有墙壁 (包括非己方的 Rempart)',
                        functionName: 'clearwall'
                    },
                    {
                        title: '给本房间签名',
                        params: [
                            { name: 'content', desc: '要签名的内容' }
                        ],
                        functionName: 'sign'
                    }
                ]
            },
            {
                name: '战争 API',
                describe: '用于启动 / 执行 / 终止战争',
                api: [
                    {
                        title: '启动战争',
                        describe: '进入战争状态，会同步启动 boost 进程',
                        functionName: 'war'
                    },
                    {
                        title: '结束战争',
                        describe: '解除战争状态并回收 boost 材料',
                        functionName: 'nowar'
                    },
                    {
                        title: '孵化进攻单位',
                        describe: '孵化基础、无 boost 的红球单位',
                        params: [
                            { name: 'targetFlagName', desc: `[可选] 进攻旗帜名称，默认为 ${DEFAULT_FLAG_NAME.ATTACK}` },
                            { name: 'num', desc: '[可选] 要孵化的数量，1 - 10，默认为 1' }
                        ],
                        functionName: 'spwanSoldier'
                    },
                    {
                        title: '孵化进攻一体机',
                        describe: '<需要战争状态> 包含完全 boost 的蓝绿球单位',
                        params: [
                            { name: 'bearTowerNum', desc: '[可选] 抗塔等级 0-6，等级越高扛伤能力越强，伤害越低，默认为 6' },
                            { name: 'targetFlagName', desc: `[可选] 进攻旗帜名称，默认为 ${DEFAULT_FLAG_NAME.ATTACK}` },
                            { name: 'keepSpawn', desc: '[可选] 是否持续生成，置为 true 时可以执行 creepApi.remove("creepName") 来终止持续生成，默认为 false' },
                        ],
                        functionName: 'spawnRangedAttacker'
                    },
                    {
                        title: '孵化拆墙小组',
                        describe: '<需要战争状态> 包含完全 boost 的黄球 / 绿球双人小组',
                        params: [
                            { name: 'targetFlagName', desc: `[可选] 进攻旗帜名称，默认为 ${DEFAULT_FLAG_NAME.ATTACK}` },
                            { name: 'keepSpawn', desc: '[可选] 是否持续生成，置为 true 时可以执行 creepApi.remove("creepName") 来终止持续生成，默认为 false' }
                        ],
                        functionName: 'spawnDismantleGroup'
                    },
                    {
                        title: '孵化掠夺者',
                        params: [
                            { name: 'sourceFlagName', desc: `[可选] 要搜刮的建筑上插好的旗帜名，默认为 ${DEFAULT_FLAG_NAME.REIVER}` },
                            { name: 'targetStructureId', desc: `[可选] 要把资源存放到的建筑 id，默认为房间终端` }
                        ],
                        functionName: 'spawnReiver'
                    }
                ]
            }
        ]
        return createHelp(...moduleList)
    }
}