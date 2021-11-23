import { repairSetting, MIN_WALL_HITS } from '@/setting'
import roles from '@/role'
import { goTo, setWayPoint } from '@/modulesGlobal/move'
import { getMemoryFromCrossShard } from '@/modulesGlobal/crossShard'
import { useCache } from '@/utils'
import { getNearSite } from '@/modulesGlobal/construction'
import { Color } from '@/modulesGlobal'
import { CreepConfig, CreepRole, RoleCreep } from '@/role/types/role'
import { MoveOpt } from '@/modulesGlobal/move/types'

// creep 原型拓展
export default class CreepExtension extends Creep {
    /**
     * creep 主要工作
     */
    public onWork (): void {
        if (!this.memory.role) return

        // 检查 creep 内存中的角色是否存在
        if (!(this.memory.role in roles)) {
            // 没有的话可能是放在跨 shard 暂存区了
            const memory = getMemoryFromCrossShard(this.name)
            // console.log(`${this.name} 从暂存区获取了内存`, memory)
            if (!memory) {
                this.log('找不到对应内存', Color.Yellow)
                this.say('我凉了！')
                return
            }
        }

        // 还没出生就啥都不干
        if (this.spawning) return

        // 获取对应配置项
        const creepConfig: CreepConfig<CreepRole> = roles[this.memory.role]

        // 没准备的时候就执行准备阶段
        if (!this.memory.ready) {
            // 有准备阶段配置则执行
            if (creepConfig.prepare) this.memory.ready = creepConfig.prepare(this)
            // 没有就直接准备完成
            else this.memory.ready = true
        }

        // 如果执行了 prepare 还没有 ready，就返回等下个 tick 再执行
        if (!this.memory.ready) return

        // 获取是否工作，没有 source 的话直接执行 target
        const working = creepConfig.source ? this.memory.working : true

        let stateChange = false
        // 执行对应阶段
        // 阶段执行结果返回 true 就说明需要更换 working 状态
        if (working) {
            if (creepConfig.target && creepConfig.target(this)) stateChange = true
        }
        else {
            if (creepConfig.source && creepConfig.source(this)) stateChange = true
        }

        // 状态变化了就释放工作位置
        if (stateChange) {
            this.memory.working = !this.memory.working
            if (this.memory.stand) delete this.memory.stand
        }
    }

    /**
     * 发送日志
     *
     * @param content 日志内容
     * @param instanceName 发送日志的实例名
     * @param color 日志前缀颜色
     * @param notify 是否发送邮件
     */
    log (content: string, color: Color = undefined, notify = false): void {
        this.room.log(content, this.name, color, notify)
    }

    /**
     * 切换为能量获取状态
     * 应在 target 阶段能量不足时调用
     *
     * @param creep 需要获取能量的 creep
     * @returns true
     */
    backToGetEnergy (): true {
        // 移除能量来源缓存，便于重新查找最近的
        delete this.memory.sourceId
        return true
    }

    /**
     * 无视 Creep 的寻路
     *
     * @param target 要移动到的位置
     */
    public goTo (target?: RoomPosition, moveOpt?: MoveOpt): ScreepsReturnCode {
        return goTo(this, target, moveOpt)
    }

    /**
     * 设置路径点
     *
     * @see doc/移动及寻路设计案
     * @param target 要进行设置的目标，位置字符串数组或者是路径名前缀
     */
    public setWayPoint (target: string[] | string): ScreepsReturnCode {
        return setWayPoint(this, target)
    }

    /**
     * 填充指定房间的 controller
     */
    public upgradeRoom (roomName: string): ScreepsReturnCode {
        const workRoom = Game.rooms[roomName]
        if (!workRoom) {
            this.goTo(new RoomPosition(25, 25, roomName), { checkTarget: false })
            return ERR_NOT_IN_RANGE
        }
        const result = this.upgradeController(workRoom.controller)

        if (result === ERR_NOT_IN_RANGE) this.goTo(workRoom.controller.pos)
        return result
    }

    /**
     * 建设房间内存在的建筑工地
     *
     * @param targetConstruction 要建造的目标工地，该参数无效的话将自行挑选工地
     */
    public buildStructure (targetConstruction?: ConstructionSite): CreepActionReturnCode | ERR_NOT_ENOUGH_RESOURCES | ERR_RCL_NOT_ENOUGH | ERR_NOT_FOUND {
        // 新建目标建筑工地
        const target = this.getBuildTarget(targetConstruction)

        if (!target) return ERR_NOT_FOUND
        // 上面发现有墙要刷了，这个 tick 就不再造建造了
        // 防止出现造好一个 rampart，然后直接造下一个 rampart，造好后又扭头去刷第一个 rampart 的小问题出现
        if (this.memory.fillWallId) return ERR_BUSY

        // 建设
        const buildResult = this.build(target)

        if (buildResult === ERR_NOT_IN_RANGE) this.goTo(target.pos, { range: 3 })
        return buildResult
    }

    /**
     * 建筑目标获取
     * 优先级：指定的目标 > 自己保存的目标 > 房间内保存的目标
     */
    private getBuildTarget (target?: ConstructionSite): ConstructionSite | undefined {
        // 指定了目标，直接用，并且把 id 备份一下
        if (target) {
            this.memory.constructionSiteId = target.id
            return target
        }
        // 没有指定目标，或者指定的目标消失了，从自己内存里找
        else {
            const selfKeepTarget = Game.getObjectById(this.memory.constructionSiteId)
            if (selfKeepTarget) return selfKeepTarget
            // 移除缓存，下面会重新查找
            else delete this.memory.constructionSiteId
        }

        // 自己内存里没找到，去房间内存里查之前缓存的
        const roomKeepTarget = Game.getObjectById(this.room.memory.constructionSiteId)
        // 找到了，保存到自己内存里
        if (roomKeepTarget) {
            this.memory.constructionSiteId = this.room.memory.constructionSiteId
            return roomKeepTarget
        }

        // 房间内存也没有缓存，重新搜索并缓存到房间
        delete this.room.memory.constructionSiteId
        const newTarget = useCache(() => getNearSite(this.pos), this.room.memory, 'constructionSiteId')

        // 再没有就真没有了
        return newTarget
    }

    /**
     * 稳定新墙
     * 会把内存中 fillWallId 标注的墙声明值刷到定值以上
     */
    public steadyWall (): OK | ERR_NOT_FOUND {
        const wall = Game.getObjectById(this.memory.fillWallId)
        if (!wall) return ERR_NOT_FOUND

        if (wall.hits < MIN_WALL_HITS) {
            const result = this.repair(wall)
            if (result === ERR_NOT_IN_RANGE) this.goTo(wall.pos, { range: 3 })
        }
        else delete this.memory.fillWallId

        return OK
    }

    /**
     * 填充防御性建筑
     * 包括 wall 和 rempart
     * @returns 当没有墙需要刷时返回 false，否则返回 true
     */
    public fillDefenseStructure (): boolean {
        const focusWall = this.room.memory.focusWall
        let targetWall: StructureWall | StructureRampart = null
        // 该属性不存在 或者 当前时间已经大于关注时间 就刷新
        if (!focusWall || (focusWall && Game.time >= focusWall.endTime)) {
            // 获取所有没填满的墙
            const walls = [...this.room[STRUCTURE_WALL], ...this.room[STRUCTURE_RAMPART]].filter(s => s.hits < s.hitsMax)

            // 没有目标就啥都不干
            if (walls.length <= 0) return false

            // 找到血量最小的墙
            targetWall = walls.sort((a, b) => a.hits - b.hits)[0]

            // 将其缓存在内存里
            this.room.memory.focusWall = {
                id: targetWall.id,
                endTime: Game.time + repairSetting.focusTime
            }
        }

        // 获取墙壁
        if (!targetWall) targetWall = Game.getObjectById(focusWall.id)
        // 如果缓存里的 id 找不到墙壁，就清除缓存下次再找
        if (!targetWall) {
            delete this.room.memory.focusWall
            // 这个时候返回 true，因为还不确定是否所有的墙都刷好了
            return true
        }

        // 填充墙壁
        const result = this.repair(targetWall)
        if (result === ERR_NOT_IN_RANGE) this.goTo(targetWall.pos, { range: 3 })
        return true
    }

    /**
     * 从目标结构获取能量
     *
     * @param target 提供能量的结构
     * @returns 执行 harvest 或 withdraw 后的返回值
     */
    public getEngryFrom (target: AllEnergySource): ScreepsReturnCode {
        let result: ScreepsReturnCode
        // 是建筑就用 withdraw
        if (target instanceof Structure) {
            // 如果建筑里没能量了就不去了，防止出现粘性
            if (target.store[RESOURCE_ENERGY] <= 0) return ERR_NOT_ENOUGH_ENERGY
            result = this.withdraw(target as Structure, RESOURCE_ENERGY)
        }
        else if (target instanceof Resource) result = this.pickup(target as Resource)
        // 不是的话就用 harvest
        else result = this.harvest(target as Source)

        if (result === ERR_NOT_IN_RANGE) this.goTo(target.pos, { range: 1 })

        return result
    }

    /**
     * 转移资源到建筑
     * 包含移动逻辑
     *
     * @param target 要转移到的目标
     * @param RESOURCE 要转移的资源类型
     */
    public transferTo (target: AnyCreep | Structure, RESOURCE: ResourceConstant, moveOpt: MoveOpt = {}): ScreepsReturnCode {
        this.goTo(target.pos, moveOpt)
        return this.transfer(target, RESOURCE)
    }

    /**
     * 手操 - 给 harvester 设置存放建筑
     * 将会在下次孵化后生效
     *
     * @param targetId 要存放的建筑 id
     */
    public storeTo (targetId: Id<StructureWithStore>): string {
        const isHarvester = (creep: Creep): creep is RoleCreep<CreepRole.Harvester> => {
            return creep.memory.role === CreepRole.Harvester
        }

        const target = Game.getObjectById(targetId)
        if (!target) return `${targetId} 找不到对应的建筑`
        if (!isHarvester(this)) return '该 creep 不是 harvester，无法设置存放建筑'

        this.memory.data.targetId = targetId
        return `设置完成，将会把采集到的能量存放至 ${target}`
    }
}
