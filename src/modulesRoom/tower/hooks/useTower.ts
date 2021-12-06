import { BoostState } from '@/modulesRoom/lab/types'
import { createCache } from '@/utils'
import { TowerMemoryAccessor } from '../memory'
import { DefenseState, TowerContext } from '../types'

const FILL_LOWER_LIMIT = {
    [DefenseState.Daily]: 600,
    [DefenseState.Daily]: 800,
    [DefenseState.Daily]: 800
}

/**
 * 组合 tower 防御逻辑
 */
export const useTower = function (roomName: string, context: TowerContext, db: TowerMemoryAccessor) {
    const {
        isFriend, getMemory, getTower, hasFillTowerTask, addFillTowerTask, env,
        addBoostTask, getBoostState, finishBoost, getDefender, releaseDefender, getLab
    } = context

    /**
     * 搜索敌人
     */
    const findEnemy = function (): (Creep | PowerCreep)[] {
        const room = env.getRoomByName(roomName)

        // 搜索白名单之外的玩家
        let enemyCreeps: (Creep | PowerCreep)[] = room.find(FIND_HOSTILE_CREEPS, { filter: isFriend })
        if (enemyCreeps.length <= 0) {
            enemyCreeps = room.find(FIND_HOSTILE_POWER_CREEPS, { filter: isFriend })
        }

        return enemyCreeps
    }

    const [findEnemyWithTickCache, refreshEnemyCache] = createCache(findEnemy, {
        getCacheKey: () => roomName
    })

    const runDailyWork = function (towers: StructureTower[], room: Room) {
        // 先攻击敌人
        const hasEnemy = runDailyAlert(towers)
        if (hasEnemy) return

        // 找不到敌人再维修建筑
        runDailRepair(towers)
    }

    /**
     * 遇到敌人且敌人不足以启动主动模式时的防御工作
     */
    const runDefenseWork = function (towers: StructureTower[], room: Room) {
        const enemys = findEnemyWithTickCache()

        // 没有敌人了就返回日常模式
        if (enemys.length <= 0) {
            // this.log('威胁解除，返回日常模式')
            db.updateDefenseState(DefenseState.Daily)
            context.onBackToNormal && context.onBackToNormal(room)
            return
        }

        fireToClosest(towers, enemys)
        if (checkEnemyThreat(enemys)) {
            // 启动主动防御模式
            db.updateDefenseState(DefenseState.Active)
            context.onStartActiveDefense && context.onStartActiveDefense(room)
            // this.log('已启动主动防御')
        }
    }

    const runActiveDefenseWork = function (towers: StructureTower[], room: Room) {
        const defender = getDefender(room)

        if (defender && !defender.spawning) {
            // 有防御单位并且掉血了就进行治疗
            if (defender.hits < defender.hitsMax) {
                towers.map(tower => tower.heal(defender))
            }
            // 没掉血就攻击敌人
            else {
                const enemys = findEnemyWithTickCache()
                this.fire(enemys)
            }
        }
        else {
            const enemys = findEnemyWithTickCache()

            // 没有敌人了就返回日常模式
            if (enemys.length <= 0) {
                // this.log('威胁解除，返回日常模式')
                db.updateDefenseState(DefenseState.Daily)
                context.onBackToNormal && context.onBackToNormal(room)
                const memory = getMemory(room)
                finishBoost(towers[0].room, memory.boostId)
                return
            }

            // 没有防御单位的情况下当能量大于 700 才攻击敌方单位，省下能量来之后治疗防御单位
            if (this.store[RESOURCE_ENERGY] > 700) fireToClosest(towers, enemys)

            // 没有防御单位时才准备 boost
            execBoost(room)
        }

        if (needSafeMode(room)) room.controller.activateSafeMode()
    }

    /**
     * 准备主动防御需要的 boost 并发布防御单位
     */
    const execBoost = function (room: Room): void {
        // lab 数量不够 boost 的，这活不能接
        if (getLab(room).length < 3) return
        const memory = getMemory(room)

        if (!memory.boostId) {
            memory.boostId = addBoostTask(room, [
                { resource: RESOURCE_CATALYZED_GHODIUM_ALKALIDE, amount: 16 * LAB_BOOST_MINERAL },
                { resource: RESOURCE_ZYNTHIUM_ALKALIDE, amount: 16 * LAB_BOOST_MINERAL },
                { resource: RESOURCE_UTRIUM_ACID, amount: 16 * LAB_BOOST_MINERAL }
            ])

            this.log.success('发布主动防御 boost 任务，任务 id', memory.boostId)
            return
        }

        const taskState = getBoostState(room, memory.boostId)
        if (taskState === ERR_NOT_FOUND) {
            delete memory.boostId
            return
        }

        if (taskState === BoostState.WaitBoost) {
            const result = releaseDefender(room, memory.boostId)
            env.log.success(`已发布主动防御单位，返回值：${result}`)
        }
    }

    const needSafeMode = function (room: Room) {
        const logs = room.getEventLog()
        return logs.some(log => {
            if (log.event !== EVENT_ATTACK) return false

            const target = env.getObjectById(log.data.targetId)
            if (!(target instanceof Structure)) return false

            return !([STRUCTURE_CONTAINER, STRUCTURE_WALL, STRUCTURE_RAMPART, STRUCTURE_ROAD] as string[]).includes(target.structureType)
        })
    }

    /**
     * 日常警戒
     * 间隔搜索一次，检查本房间是否有敌人，有的话则攻击并切入防御模式
     *
     * @returns 有敌人返回 true，没敌人返回 false
     */
    const runDailyAlert = function (towers: StructureTower[]): boolean {
        if (env.inInterval(5)) return false
        const enemys = findEnemyWithTickCache()
        if (enemys.length <= 0) return false

        // 发现敌人则攻击并设置状态为普通防御
        fireToClosest(towers, enemys)
        db.updateDefenseState(DefenseState.Defense)
        // this.log(`已启动防御模式`)
        return true
    }

    /**
     * 运行日常维修
     */
    const runDailRepair = function (towers: StructureTower[]) {
        if (env.inInterval(10)) return

        const damagedStructures = towers[0].room.find(FIND_STRUCTURES, {
            filter: s => s.hits < s.hitsMax &&
                // 墙壁稍后会单独修
                s.structureType !== STRUCTURE_RAMPART &&
                s.structureType !== STRUCTURE_WALL &&
                // container 由其他人专门维护
                s.structureType !== STRUCTURE_CONTAINER
        })

        // 每个掉血的建筑同一时间只会被一个 tower 修复，防止修复的奶量溢出
        for (const tower of towers) {
            const target = damagedStructures.shift()
            if (!target) break
            tower.repair(target)
        }
    }

    /**
     * 检查敌人威胁程度
     * @returns 是否需要启动主动防御
     */
    const checkEnemyThreat = function (enemys: (Creep | PowerCreep)[]): boolean {
        // 如果来的都是入侵者或者友军的话，就算撑破天了也不管
        if (enemys.every(creep => {
            return creep.owner.username === 'Invader' || context.isFriend(creep)
        })) return false

        const bodyNum = enemys.map(creep => {
            // 如果是 creep 则返回身体部件，如果不是（那就是 pc）的话就直接触发主动防御
            return creep instanceof Creep ? creep.body.length : 50
        }).reduce((pre, cur) => pre + cur)

        // 满配 creep 数量大于 1，就启动主动防御
        return bodyNum > MAX_CREEP_SIZE
    }

    /**
     * 攻击最近的目标
     * @param enemys 目标合集
     */
    const fireToClosest = function (towers: StructureTower[], enemys: (Creep | PowerCreep)[]) {
        const targetEnemy = towers[0].pos.findClosestByRange(enemys)
        towers.forEach(tower => tower.attack(targetEnemy))
    }

    /**
     * 请求能量
     * @param lowerLimit 能量下限，当自己能量低于该值时将发起请求
     */
    const requireEnergy = function (towers: StructureTower[], room: Room, lowerLimit = 900): void {
        if (hasFillTowerTask(room)) return
        const energyInsufficient = towers.some(tower => tower.store[RESOURCE_ENERGY] <= lowerLimit)
        if (energyInsufficient) addFillTowerTask(room)
    }

    const workRunners = {
        [DefenseState.Daily]: runDailyWork,
        [DefenseState.Defense]: runDefenseWork,
        [DefenseState.Active]: runActiveDefenseWork
    }

    /**
     * 执行 tower 运行逻辑
     */
    const run = function (): void {
        refreshEnemyCache()

        const room = env.getRoomByName(roomName)
        const towers = getTower(room)
        if (!towers || towers.length <= 0) return

        const defenseState = db.queryDefenseState()
        if (!(env.getGame().time % 5)) {
            requireEnergy(towers, room, FILL_LOWER_LIMIT[defenseState])
        }

        // 根据当前状态执行对应的逻辑
        workRunners[defenseState](towers, room)
    }

    return { run, checkEnemyThreat, findEnemy: findEnemyWithTickCache }
}
