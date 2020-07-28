import { DEPOSIT_MAX_COOLDOWN, observerInterval } from 'setting'
import { creepApi } from 'modules/creepController'
import { colorful } from 'utils'
import { createHelp } from 'modules/help'

/**
 * Observer 拓展
 * 定期搜索给定列表中的房间并插旗
 */
export class ObserverExtension extends StructureObserver {
    public work(): void {
        const memory = this.room.memory.observer
        // 没有初始化或者暂停了就不执行工作
        if (!memory) return
        if (memory.pause) return
        // 都找到上限就不继续工作了
        if ((memory.pbNumber >= memory.pbMax) && (memory.depositNumber >= memory.depositMax)) return

        // 如果房间没有视野就获取视野，否则就执行搜索
        if (this.room.memory.observer.checkRoomName) this.searchRoom()
        else this.obRoom()
    }

    public onBuildComplete(): void {
        this.room.memory.observerId = this.id
    }

    /**
     * 在房间内执行搜索
     * 该方法会搜索房间中的 deposits 和 power bank，一旦发现自动插旗
     */
    private searchRoom(): void {
        // 从内存中获取要搜索的房间
        const memory = this.room.memory.observer
        const room = Game.rooms[memory.checkRoomName]
        // 兜底
        if (!room) {
            delete this.room.memory.observer.checkRoomName
            return
        }
        // this.log(`搜索房间 ${room.name}`)

        // 还没插旗的话就继续查找 deposit
        if (memory.depositNumber < memory.depositMax) {
            const deposits = room.find(FIND_DEPOSITS)
            // 对找到的 deposit 进行处置归档
            deposits.forEach(deposit => {
                // 冷却过长或者已经插旗的忽略
                if (deposit.lastCooldown >= DEPOSIT_MAX_COOLDOWN) return
                const flags = deposit.pos.lookFor(LOOK_FLAGS)
                if (flags.length > 0) return
                
                // 确认完成，插旗
                this.newHarvesteTask(deposit)
                this.log(`${this.room.memory.observer.checkRoomName} 检测到新 deposit, 已插旗`, 'green')
            })
        }
        
        // 还没插旗的话就继续查找 pb
        if (memory.pbNumber < memory.pbMax) {
            // pb 的存活时间大于 3000 / power 足够大的才去采集
            const powerBanks = room.find<StructurePowerBank>(FIND_STRUCTURES, {
                filter: s => s.structureType == STRUCTURE_POWER_BANK && s.ticksToDecay >= 3000 && (s as StructurePowerBank).power >= 2000
            })
            // 对找到的 pb 进行处置归档
            powerBanks.forEach(powerBank => {
                const flags = powerBank.pos.lookFor(LOOK_FLAGS)
                if (flags.length > 0) return
    
                // 确认完成，插旗
                this.newHarvesteTask(powerBank)
                this.log(`${this.room.memory.observer.checkRoomName} 检测到新 pb, 已插旗`, 'green')  
            })
        }

        // 确认该房间已被搜索
        delete this.room.memory.observer.checkRoomName
    }

    /**
     * 发布新的采集任务
     * 会自行插旗并发布角色组
     * 
     * @param target 要采集的资源
     */
    private newHarvesteTask(target: StructurePowerBank | Deposit): OK | ERR_INVALID_TARGET {
        if (target instanceof StructurePowerBank) {
            const targetFlagName = `${STRUCTURE_POWER_BANK} ${this.room.name} ${Game.time}`
            target.pos.createFlag(targetFlagName)

            // 更新数量
            this.room.memory.observer.pbNumber += 1
            // 计算应该发布的采集小组数量，最高两组
            const groupNumber = target.pos.getFreeSpace().length > 1 ? 2 : 1
            
            // 发布 attacker 和 healer，搬运者由 attacker 在后续任务中自行发布
            for (let i = 0; i < groupNumber; i++) {
                const attackerName = `${targetFlagName} attacker${i}`
                const healerName = `${targetFlagName} healer${i}`

                // 添加采集小组
                creepApi.add(attackerName, 'pbAttacker', {
                    sourceFlagName: targetFlagName,
                    spawnRoom: this.room.name,
                    healerCreepName: healerName
                }, this.room.name)
                creepApi.add(healerName, 'pbHealer', {
                    creepName: `${targetFlagName} attacker${i}`
                }, this.room.name)
            }
        }
        else if (target instanceof Deposit) {
            const targetFlagName = `deposit ${this.room.name} ${Game.time}`
            target.pos.createFlag(targetFlagName)

            // 更新数量
            this.room.memory.observer.depositNumber += 1

            // 发布采集者，他会自行完成剩下的工作
            creepApi.add(`${targetFlagName} worker`, 'depositHarvester', {
                sourceFlagName: targetFlagName,
                spawnRoom: this.room.name
            }, this.room.name)
        }
        else return ERR_INVALID_TARGET

        
        return OK
    }

    /**
     * 获取指定房间视野
     */
    private obRoom(): void {
        if (Game.time % observerInterval) return

        // 执行视野获取
        const roomName = this.room.memory.observer.watchRooms[this.room.memory.observer.watchIndex]
        const obResult = this.observeRoom(roomName)
        // this.log(`ob 房间 ${roomName}`)

        // 标志该房间视野已经获取，可以进行检查
        if (obResult === OK) this.room.memory.observer.checkRoomName = roomName

        // 设置下一个要查找房间的索引
        this.room.memory.observer.watchIndex = this.room.memory.observer.watchIndex < (this.room.memory.observer.watchRooms.length - 1) ?
            this.room.memory.observer.watchIndex + 1 : 0
    }

    /**
     * 初始化 observer
     */
    protected init(): void {
        this.room.memory.observer = {
            watchIndex: 0,
            watchRooms: [],
            pbNumber: 0,
            depositNumber: 0,
            pbMax: 1,
            depositMax: 1
        }
    }
}

export class ObserverConsole extends ObserverExtension {
    /**
     * 用户操作 - 查看状态
     */
    public stats(): string {
        if (!this.room.memory.observer) return `[${this.room.name} observer] 未启用，使用 .help() 来查看更多用法`
        
        let stats = [ `[${this.room.name} observer] 当前状态`, this.showList() ]
        // 这里并没有直接用 memory 里的信息，是因为为了保证准确性，并且下面会用 Game.flags 进行统计，所以也不用多费什么事情
        let pbNumber = 0
        let pbDetail = ''
        let depositNumber = 0
        let depositDetail = ''

        // 遍历所有 flag，统计两种资源的旗帜数量
        for (const flagName in Game.flags) {
            if (flagName.includes(`${STRUCTURE_POWER_BANK} ${this.room.name}`)) {
                pbNumber += 1
                pbDetail += ` ${Game.flags[flagName].pos.roomName}`
                continue
            }
            if (flagName.includes(`deposit ${this.room.name}`)) {
                depositNumber += 1
                depositDetail += ` ${Game.flags[flagName].pos.roomName}`
                continue
            }
        }

        stats.push(`[powerBank] 已发现：${pbNumber}/${this.room.memory.observer.pbMax} ${pbDetail ? '[位置]' : ''} ${pbDetail}`)
        stats.push(`[deposit] 已发现：${depositNumber}/${this.room.memory.observer.depositMax} ${pbDetail ? '[位置]' : ''} ${depositDetail}`)

        // 更新缓存信息
        this.room.memory.observer.pbNumber = pbNumber
        this.room.memory.observer.depositNumber = depositNumber

        return stats.join('\n')
    }

    /**
     * 设置 observer 对 pb、deposit 的搜索上限
     * 
     * @param type 要设置的类型
     * @param max 要设置的最大值
     */
    public setmax(type: 'powerbank' | 'deposit', max: number): string {
        if (!this.room.memory.observer) return `[${this.room.name} observer] 未启用，使用 .help() 来查看更多用法`
        if (max < 0) return `[${this.room.name} observer] 最大数量不得小于 0，请重新指定`

        if (type === 'powerbank') this.room.memory.observer.pbMax = max
        else if (type == 'deposit') this.room.memory.observer.depositMax = max
        else return `[${this.room.name} observer] 错误的类型，必须为 powerbank 或者 deposit`

        return `[${this.room.name} observer] 配置成功\n` + this.stats()
    }

    /**
     * 用户操作 - 新增监听房间
     * 
     * @param roomNames 要进行监听的房间名称
     */
    public add(...roomNames: string[]): string {
        if (!this.room.memory.observer) this.init()

        // 确保新增的房间名不会重复
        this.room.memory.observer.watchRooms = _.uniq([ ...this.room.memory.observer.watchRooms, ...roomNames])

        return `[${this.room.name} observer] 已添加，${this.showList()}`
    }

    /**
     * 用户操作 - 移除监听房间
     * 
     * @param roomNames 不在监听的房间名
     */
    public remove(...roomNames: string[]): string {
        if (!this.room.memory.observer) this.init()

        // 移除指定房间
        this.room.memory.observer.watchRooms = _.difference(this.room.memory.observer.watchRooms, roomNames)
        
        return `[${this.room.name} observer] 已移除，${this.showList()}`
    }

    /**
     * 用户操作 - 暂停 observer
     */
    public off(): string {
        if (!this.room.memory.observer) return `[${this.room.name} observer] 未启用`

        this.room.memory.observer.pause = true

        return `[${this.room.name} observer] 已暂停`
    }

    /**
     * 用户操作 - 重启 observer
     */
    public on(): string {
        if (!this.room.memory.observer) return `[${this.room.name} observer] 未启用`

        delete this.room.memory.observer.pause

        return `[${this.room.name} observer] 已恢复, ${this.showList()}`
    }

    /**
     * 用户操作 - 清空房间列表
     */
    public clear(): string {
        if (!this.room.memory.observer) this.init()

        this.room.memory.observer.watchRooms = []

        return `[${this.room.name} observer] 已清空监听房间`
    }

    /**
     * 用户操作 - 显示当前监听的房间列表
     * 
     * @param noTitle 该参数为 true 则不显示前缀
     */
    public showList(): string {
        const result = this.room.memory.observer ? 
        `监听中的房间列表: ${this.room.memory.observer.watchRooms.map((room, index) => {
            if (index === this.room.memory.observer.watchIndex) return colorful(room, 'green')
            else return room
        }).join(' ')}` :
        `未启用`

        return result
    }

    /**
     * 用户操作 - 帮助
     */
    public help(): string {
        return createHelp({
            name: 'Observer 控制台',
            describe: 'Observer 默认关闭，新增监听房间后将会启动，在监听房间中发现 pb 或者 deposit 时将会自动发布采集单位。',
            api: [
                {
                    title: '新增监听房间',
                    params: [
                        { name: '...roomNames', desc: '要监听的房间名列表' }
                    ],
                    functionName: 'add'
                },
                {
                    title: '移除监听房间',
                    params: [
                        { name: '...roomNames', desc: '要移除的房间名列表' }
                    ],
                    functionName: 'remove'
                },
                {
                    title: '设置上限',
                    describe: '设置对 pb、deposit 的搜索上限，默认为 1（每种同时只采集一个）',
                    params: [
                        { name: 'type', desc: 'powerbank 或 deposit 字符串之一' },
                        { name: 'max', desc: '查找的最大值' }
                    ],
                    functionName: 'setmax'
                },
                {
                    title: '显示状态',
                    functionName: 'stats'
                },
                {
                    title: '移除所有监听房间',
                    functionName: 'clear'
                },
                {
                    title: '暂停工作',
                    functionName: 'off'
                },
                {
                    title: '重启工作',
                    functionName: 'on'
                }
            ]
        })
    }
}