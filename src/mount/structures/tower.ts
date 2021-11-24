import { Color } from '@/modulesGlobal'
import { TransportTaskType } from '@/modulesRoom'
import { BoostState } from '@/modulesRoom/lab/types'
import { GetName } from '@/modulesRoom/spawn/nameGetter'
import { CreepRole } from '@/role/types/role'
import { repairSetting } from '@/setting'
import { whiteListFilter } from '@/utils'

// Tower 原型拓展
export default class TowerExtension extends StructureTower {
    /**
     * 主要任务
     */
    public run (): void {
        // 根据当前状态执行对应的逻辑
        switch (this.room.memory.defenseMode) {
        case 'defense': // 普通防御模式
            this.defenseWork()
            break
        case 'active': // 主动防御模式
            this.activeWork()
            break
        default: // 日常模式
            this.dailyWork()
            break
        }
    }

    /**
     * 回调 - 建造完成
     */
    public onBuildComplete (): void {
        this.requireEnergy()
    }

    /**
     * 日常的 tower 工作
     */
    private dailyWork (): void {
        // 如果能量低了就发布填充任务
        this.requireEnergy(600)

        // 先攻击敌人
        if (this.dailyAlert()) return

        // 找不到敌人再维修建筑
        this.commandRepair()
    }

    /**
     * 遇到敌人且敌人不足以启动主动模式时的防御工作
     */
    private defenseWork (): void {
        const enemys = this.findEnemy()

        // 没有敌人了就返回日常模式
        if (enemys.length <= 0) {
            // this.log('威胁解除，返回日常模式')
            delete this.room.memory.defenseMode
            // 重新跑一遍建筑规划，防止有建筑被拆了
            this.room.planLayout()
            this.room.strategy.operation.useUnitSetting()
            return
        }

        this.fire(enemys)
        if (this.room.controller.checkEnemyThreat()) {
            // 启动主动防御模式
            this.room.memory.defenseMode = 'active'
            this.room.strategy.defense.useUnitSetting()
            // this.log('已启动主动防御')
        }

        // 如果能量低了就发布填充任务
        this.requireEnergy(700)
    }

    /**
     * 主动防御模式 tower 工作
     */
    private activeWork (): void {
        const defenderName = GetName.defender(this.room.name)
        const defender = Game.creeps[defenderName]

        if (defender && !defender.spawning) {
            // 有防御单位并且掉血了就进行治疗
            if (defender.hits < defender.hitsMax) {
                this.heal(defender)
            }
            // 没掉血就攻击敌人
            else {
                const enemys = this.findEnemy()
                this.fire(enemys)
            }
        }
        else {
            const enemys = this.findEnemy()

            // 没有敌人了就返回日常模式
            if (enemys.length <= 0) {
                // this.log('威胁解除，返回日常模式')
                delete this.room.memory.defenseMode
                this.room.planLayout()
                this.room.myLab.finishBoost(this.room.memory.defenseBoostTaskId)
                return
            }

            // 没有防御单位的情况下当能量大于 700 才攻击敌方单位，省下能量来之后治疗防御单位
            if (this.store[RESOURCE_ENERGY] > 700) this.fire(enemys)

            // 没有防御单位时才准备 boost
            this.prepareBoost(defenderName)
        }

        this.wallCheck()
        this.requireEnergy(700)
    }

    /**
     * 准备主动防御需要的 boost 并发布防御单位
     *
     * @param defenderName 要发布的防御单位名称
     */
    private prepareBoost (defenderName: string): void {
        if (!this.room.memory.defenseBoostTaskId) {
            this.room.memory.defenseBoostTaskId = this.room.myLab.addBoostTask([
                { resource: RESOURCE_CATALYZED_GHODIUM_ALKALIDE, amount: 16 * LAB_BOOST_MINERAL },
                { resource: RESOURCE_ZYNTHIUM_ALKALIDE, amount: 16 * LAB_BOOST_MINERAL },
                { resource: RESOURCE_UTRIUM_ACID, amount: 16 * LAB_BOOST_MINERAL }
            ])

            this.log('发布主动防御 boost 任务，任务 id', this.room.memory.defenseBoostTaskId)
            return
        }

        const taskState = this.room.myLab.getBoostState(this.room.memory.defenseBoostTaskId)
        if (taskState === ERR_NOT_FOUND) {
            delete this.room.memory.defenseBoostTaskId
            return
        }

        if (taskState === BoostState.WaitBoost && !(defenderName in Game.creeps)) {
            const result = this.room.spawner.addTask(defenderName, CreepRole.Defender, {
                boostTaskId: this.room.memory.defenseBoostTaskId
            })
            this.log(`已发布主动防御单位 ${defenderName}，返回值：${result}`, Color.Green)
        }
    }

    /**
     * 墙壁检查
     * 受到攻击就孵化修墙工
     * 有墙壁被摧毁就进入安全模式
     */
    private wallCheck (): void {
        const logs = this.room.getEventLog()

        for (const log of logs) {
            // 墙壁或 ram 被摧毁
            if (log.event === EVENT_OBJECT_DESTROYED) {
                // 不是墙体被摧毁就继续检查 log
                if (!log.data || (log.data.type !== STRUCTURE_RAMPART && log.data.type !== STRUCTURE_WALL)) continue
                // 有墙体被摧毁，直接启动安全模式
                this.room.controller.activateSafeMode()
                const enemyUsername = _.uniq(this.room._enemys.map(creep => creep.owner.username)).join(', ')
                Game.notify(`[${this.room.name}] 墙壁被击破，已启动安全模式 [Game.ticks] ${Game.time} [敌人] ${enemyUsername}`)

                break
            }
            // 墙壁被攻击
            else if (log.event === EVENT_ATTACK) {
                const target = Game.getObjectById(log.data.targetId as Id<Structure>)
                if (!target) continue

                if (target instanceof StructureRampart || target instanceof StructureWall) {
                    // 将其缓存在内存里
                    this.room.memory.focusWall = {
                        id: target.id,
                        endTime: Game.time + repairSetting.focusTime
                    }
                }
            }
        }
    }

    /**
     * 日常警戒
     * 间隔搜索一次，检查本房间是否有敌人，有的话则攻击并切入防御模式
     *
     * @returns 有敌人返回 true，没敌人返回 false
     */
    private dailyAlert (): boolean {
        const enemys = this.findEnemy(5)
        if (enemys.length <= 0) return false

        // 发现敌人则攻击并设置状态为普通防御
        this.fire(enemys)
        this.room.memory.defenseMode = 'defense'
        // this.log(`已启动防御模式`)
        return true
    }

    /**
     * 维修指令
     * 维修受损的建筑，不维修 WALL 和 RAMPART
     *
     * @returns 进行维修返回 true，没有维修返回 false
     */
    private commandRepair (): boolean {
        // 还没到检查时间就跳过
        if (Game.time % repairSetting.checkInterval) return false

        // 找到受损建筑
        // 没有缓存就进行搜索
        if (!this.room._damagedStructure) {
            const damagedStructures = <AnyStructure[]> this.room.find(FIND_STRUCTURES, {
                filter: s => s.hits < s.hitsMax &&
                    // 墙壁稍后会单独修
                    s.structureType !== STRUCTURE_RAMPART &&
                    s.structureType !== STRUCTURE_WALL &&
                    // container 由 harvester 专门维护
                    s.structureType !== STRUCTURE_CONTAINER
            })

            // 找到最近的受损建筑并更新缓存
            if (damagedStructures.length > 0) {
                this.room._damagedStructure = this.pos.findClosestByRange(damagedStructures)
            }
            else {
                this.room._damagedStructure = 1
                return false
            }
        }

        // 代码能执行到这里就说明缓存肯定不为空
        // 如果是 1 说明都不需要维修
        if (this.room._damagedStructure !== 1) {
            this.repair(this.room._damagedStructure)
            // 这里把需要维修的建筑置为 1 是为了避免其他的 tower 奶一个满血建筑从而造成 cpu 浪费
            if (this.room._damagedStructure.hits + 500 >= this.room._damagedStructure.hitsMax) this.room._damagedStructure = 1

            return true
        }
        return false
    }

    /**
     * 搜索敌人
     *
     * @param searchInterval 搜索间隔，每隔多久进行一次搜索
     */
    private findEnemy (searchInterval = 1): (Creep|PowerCreep)[] {
        if (Game.time % searchInterval) return []
        // 有其他 tower 搜索好的缓存就直接返回
        if (this.room._enemys) return this.room._enemys

        // 搜索白名单之外的玩家
        this.room._enemys = this.room.find(FIND_HOSTILE_CREEPS, {
            filter: whiteListFilter
        })
        if (this.room._enemys.length <= 0) {
            this.room._enemys = this.room.find(FIND_HOSTILE_POWER_CREEPS, {
                filter: whiteListFilter
            })
        }

        return this.room._enemys
    }

    /**
     * 选择目标并开火
     *
     * @param enemys 目标合集
     */
    private fire (enemys: (Creep|PowerCreep)[]): ScreepsReturnCode {
        if (enemys.length <= 0) return ERR_NOT_FOUND

        return this.attack(this.pos.findClosestByRange(enemys))
    }

    /**
     * 请求能量
     *
     * @param lowerLimit 能量下限，当自己能量低于该值时将发起请求
     */
    private requireEnergy (lowerLimit = 900): void {
        if (
            this.store[RESOURCE_ENERGY] <= lowerLimit &&
            !this.room.transport.hasTaskWithType(TransportTaskType.FillTower)
        ) {
            this.room.transport.addTask({
                type: TransportTaskType.FillTower,
                priority: 9,
                requests: [{ resType: RESOURCE_ENERGY, to: [STRUCTURE_TOWER], keep: true }]
            })
        }
    }
}
