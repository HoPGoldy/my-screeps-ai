import { BoostState } from '@/modulesRoom/lab/types'
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
export const useTower = function (context: TowerContext, db: TowerMemoryAccessor) {
    const {
        isFriend, getMemory, getTower, getWorkRoom, hasFillTowerTask, addFillTowerTask, env,
        addBoostTask, getBoostState, finishBoost, getDefender, releaseDefender
    } = context

    /**
     * 搜索敌人
     * @param searchInterval 搜索间隔，每隔多久进行一次搜索
     */
    const findEnemy = function (searchInterval = 1): (Creep | PowerCreep)[] {
        if (env.inInterval(searchInterval)) return []
        const workRoom = getWorkRoom()

        // 搜索白名单之外的玩家
        let enemyCreeps: (Creep | PowerCreep)[] = workRoom.find(FIND_HOSTILE_CREEPS, { filter: isFriend })
        if (enemyCreeps.length <= 0) {
            enemyCreeps = workRoom.find(FIND_HOSTILE_POWER_CREEPS, { filter: isFriend })
        }

        return enemyCreeps
    }

    const runDailyWork = function (towers: StructureTower[]) {
        // 先攻击敌人
        const hasEnemy = runDailyAlert(towers)
        if (hasEnemy) return

        // 找不到敌人再维修建筑
        runDailRepair(towers)
    }

    /**
     * 遇到敌人且敌人不足以启动主动模式时的防御工作
     */
    const runDefenseWork = function (towers: StructureTower[]) {
        const enemys = findEnemy()

        // 没有敌人了就返回日常模式
        if (enemys.length <= 0) {
            // this.log('威胁解除，返回日常模式')
            db.updateDefenseState(DefenseState.Daily)
            context.onBackToNormal && context.onBackToNormal()
            return
        }

        fireToClosest(towers, enemys)
        if (checkEnemyThreat(enemys)) {
            // 启动主动防御模式
            db.updateDefenseState(DefenseState.Active)
            context.onStartActiveDefense && context.onStartActiveDefense()
            // this.log('已启动主动防御')
        }
    }

    const runActiveDefenseWork = function (towers: StructureTower[]) {
        const defender = getDefender()

        if (defender && !defender.spawning) {
            // 有防御单位并且掉血了就进行治疗
            if (defender.hits < defender.hitsMax) {
                towers.map(tower => tower.heal(defender))
            }
            // 没掉血就攻击敌人
            else {
                const enemys = findEnemy()
                this.fire(enemys)
            }
        }
        else {
            const enemys = findEnemy()

            // 没有敌人了就返回日常模式
            if (enemys.length <= 0) {
                // this.log('威胁解除，返回日常模式')
                db.updateDefenseState(DefenseState.Daily)
                context.onBackToNormal && context.onBackToNormal()
                const memory = getMemory()
                finishBoost(towers[0].room, memory.boostId)
                return
            }

            // 没有防御单位的情况下当能量大于 700 才攻击敌方单位，省下能量来之后治疗防御单位
            if (this.store[RESOURCE_ENERGY] > 700) fireToClosest(towers, enemys)

            // 没有防御单位时才准备 boost
            execBoost()
        }

        if (needSafeMode()) getWorkRoom().controller.activateSafeMode()
    }

    /**
     * 准备主动防御需要的 boost 并发布防御单位
     */
    const execBoost = function (): void {
        const memory = getMemory()
        const workRoom = getWorkRoom()

        if (!memory.boostId) {
            memory.boostId = addBoostTask(workRoom, [
                { resource: RESOURCE_CATALYZED_GHODIUM_ALKALIDE, amount: 16 * LAB_BOOST_MINERAL },
                { resource: RESOURCE_ZYNTHIUM_ALKALIDE, amount: 16 * LAB_BOOST_MINERAL },
                { resource: RESOURCE_UTRIUM_ACID, amount: 16 * LAB_BOOST_MINERAL }
            ])

            this.log.success('发布主动防御 boost 任务，任务 id', memory.boostId)
            return
        }

        const taskState = getBoostState(workRoom, memory.boostId)
        if (taskState === ERR_NOT_FOUND) {
            delete memory.boostId
            return
        }

        if (taskState === BoostState.WaitBoost) {
            const result = releaseDefender(memory.boostId)
            env.log.success(`已发布主动防御单位，返回值：${result}`)
        }
    }

    const needSafeMode = function () {
        const logs = getWorkRoom().getEventLog()
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
        const enemys = findEnemy(5)
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
    const requireEnergy = function (towers: StructureTower[], lowerLimit = 900): void {
        if (hasFillTowerTask()) return
        const energyInsufficient = towers.some(tower => tower.store[RESOURCE_ENERGY] <= lowerLimit)
        if (energyInsufficient) addFillTowerTask()
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
        const towers = getTower()
        if (!towers || towers.length <= 0) return

        const defenseState = db.queryDefenseState()
        if (!(env.getGame().time % 5)) {
            requireEnergy(towers, FILL_LOWER_LIMIT[defenseState])
        }

        // 根据当前状态执行对应的逻辑
        workRunners[defenseState](towers)
    }

    return { run, checkEnemyThreat }
}
