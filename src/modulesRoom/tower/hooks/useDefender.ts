import { createRole } from '@/modulesRoom/unitControl/controller'
import { calcBodyPart } from '@/utils'
import { DEFAULT_DEFENDER_ROLE } from '../constants'
import { DefenderMemory, DefenderWorkContext, TowerContext } from '../types'

/**
 * 生成防御单位的名字
 */
export const getDefenderName = (roomName: string) => `${roomName} defender`

/**
 * 生成防御单位的身体
 * 34 个 t3 强化的 ATTACK 可以造成 4.08K/T 的伤害，刚好可以打穿 12 个 T3 TOUGH
 */
export const getDefenderBody = () => calcBodyPart([[TOUGH, 6], [ATTACK, 34], [MOVE, 10]])

/**
 * 防御单位
 * 会自动攻击房间内的敌对单位
 * 注意身体部件不会自动适配，也就是说低等级房间无法造出来这个单位。原因在于低等级房间就算能造出来小 creep 也等于送人头。
 */
export const useDefender = function (context: TowerContext, getTowerController: DefenderWorkContext) {
    const {
        env, getMemory, addSpawnTask, addSpawnCallback, onCreepStageChange, boostCreep, reloadBoostTask, finishBoost,
        defenderRole = DEFAULT_DEFENDER_ROLE
    } = context

    const defender = createRole<DefenderMemory>({
        getMemory: room => {
            const memory = getMemory(room)
            if (!memory.defender) memory.defender = {}
            return memory.defender
        },
        onCreepDead: (creepName, memory, workRoom) => {
            const { checkEnemyThreat, findEnemy } = getTowerController(workRoom)
            const needSpawn = checkEnemyThreat(findEnemy())
            const { boostTaskId } = memory

            // 如果威胁已经解除了，就不再孵化
            if (!needSpawn && boostTaskId) {
                finishBoost(workRoom, boostTaskId)
                const { time, notify } = env.getGame()
                const log = `[${workRoom.name}][${time}] 入侵威胁解除，已取消主动防御模式`
                notify(log)
                env.log.success(log)
            }
            // 还要打，续上
            else reloadBoostTask(workRoom, boostTaskId)

            return needSpawn
        },
        /**
         * 执行强化
         */
        runPrepare: (creep, memory, workRoom) => {
            if (!memory.boostTaskId) return true
            return boostCreep(workRoom, creep, memory.boostTaskId)
        },
        /**
         * 运回存储建筑
         */
        runTarget: (creep, memory) => {
            const enemys = creep.room.towerController.findEnemy()
            // 没有敌人就啥也不干
            if (enemys.length <= 0) return false

            // 从缓存中获取敌人
            const enemy = creep.pos.findClosestByRange(enemys)
            creep.say('💢')
            // 防止一不小心出房间了
            if (
                (enemy.pos.x !== 0 && enemy.pos.x !== 49 && enemy.pos.y !== 0 && enemy.pos.y !== 49) &&
                !creep.pos.isNearTo(enemy.pos)
            ) creep.moveTo(enemy.pos)

            creep.attack(enemy)
        },
        onCreepStageChange
    })

    addSpawnCallback(defenderRole, defender.addUnit)

    /**
     * 发布防御单位
     *
     * @param room 要发布到的房间
     * @param boostTaskId 使用的强化任务
     */
    const releaseDefender = function (room: Room, boostTaskId: number) {
        const creepName = getDefenderName(room.name)
        addSpawnTask(room, creepName, defenderRole, getDefenderBody())
        defender.registerUnit(creepName, { boostTaskId }, room)
    }

    return { defender, releaseDefender }
}
