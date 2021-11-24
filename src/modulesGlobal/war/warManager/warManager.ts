import { WarMemory, WarState } from '../types'
import { createMobilizeManager } from '../mobilizeManager/mobilizeManager'
import { createMemoryAccessor } from './memoryAccessor'
import { createSquadManager, hasMyCreep } from '../squadManager/squadManager'
import { arrayToObject, createCluster, EnvContext, getBodySpawnEnergy } from '@/utils'
import { SquadType, SquadTypeName } from '../squadManager/types'
import { DEFAULT_SQUAD_CODE } from '../utils'
import { getBodyBoostResource } from '@/role/bodyUtils'
import { createSpawnInfo } from '../mobilizeManager/getBodyPart'

export type WarContext = {
    warCode: string
    removeSelf: () => void
    getWarMemory: () => WarMemory
} & EnvContext

export const createWarManager = function (context: WarContext) {
    const { getWarMemory, env, warCode } = context
    const { spawnRoomName } = getWarMemory()
    const db = createMemoryAccessor(getWarMemory)

    /**
     * 初始化所有小队
     */
    const initSquad = function () {
        const { squads } = getWarMemory()

        return arrayToObject(Object.entries(squads).map(([code]) => [code, createSquadManager({
            ...context,
            warCode,
            squadCode: code,
            getMemory: () => db.querySquad(code),
            getWarState: () => getWarMemory().state,
            dismiss: aliveCreeps => dismissSquad(code, aliveCreeps)
        })]))
    }

    const squadCluster = createCluster(initSquad)

    const mobilizeManager = createMobilizeManager({
        ...context,
        getMemory: db.queryCurrentMobilizeTask,
        getSpawnRoom: () => env.getRoomByName(spawnRoomName),
        finishTask: (creeps) => {
            const { squadCode, suqadTarget, squadType } = db.queryCurrentMobilizeTask()
            addSquad(squadType, creeps, suqadTarget, squadCode)
            env.log.success(`动员任务 ${SquadTypeName[squadType]} ${squadCode} 已完成`)
            db.deleteCurrentMobilizeTask()
        },
        abandonTask: reason => {
            const task = db.queryCurrentMobilizeTask()
            env.log.warning(`动员任务 ${SquadTypeName[task.squadType]} ${task.squadCode} 已停止：` + reason)
            db.deleteCurrentMobilizeTask()
        }
    })

    /**
     * 新建小队
     *
     * @param type 小队类型
     * @param members 小队成员
     * @param targetFlagName 要进攻的旗帜名
     * @param code 小队代号
     */
    const addSquad = function (type: SquadType, members: Creep[], targetFlagName: string, code: string) {
        db.insertSquad(type, members.map(c => c.name), targetFlagName, code)

        const newSquad = createSquadManager({
            ...context,
            warCode,
            squadCode: code,
            getMemory: () => db.querySquad(code),
            getWarState: () => getWarMemory().state,
            dismiss: aliveCreeps => dismissSquad(code, aliveCreeps)
        })

        squadCluster.add(code, newSquad)
    }

    /**
     * 解散指定小队
     *
     * @param squadCode 要解散的小队代号
     * @param aliveCreeps 剩余的小队成员
     */
    const dismissSquad = function (squadCode: string, aliveCreeps: Creep[]) {
        squadCluster.remove(squadCode)
        db.deleteSquad(squadCode)
        db.insertAlonedCreep(aliveCreeps.map(c => c.name))
    }

    /**
     * 检查房间是否具有足够孵化该小队的能力
     *
     * @param room 孵化房间
     * @param needBoost 是否需要 boost
     * @param type 小队类型
     */
    const checkMobilizeAbility = function (room: Room, needBoost: boolean, type: SquadType): boolean {
        const spawnInfo = createSpawnInfo(room, 'test', type)
        const allBody: BodyPartConstant[] = [].concat(...Object.values(spawnInfo).map(info => info.bodys))

        if (needBoost) {
            const boostResource = getBodyBoostResource(allBody)

            const allResourceEnough = boostResource.every(boostRes => {
                const { total } = room.myStorage.getResource(boostRes.resource)
                return total > boostRes.amount
            })

            if (boostResource.length > room[STRUCTURE_LAB].length) {
                env.log.warning(`所需 lab 数量不足，需要 ${boostResource.length} 现存 ${room[STRUCTURE_LAB].length}`)
                return false
            }

            // boost 资源不足，将不会继续动员
            if (!allResourceEnough) {
                env.log.warning('所需 boost 资源不足')
                return false
            }
        }

        const spawnEnergyCost = getBodySpawnEnergy(allBody)

        if (room.energyCapacityAvailable < spawnEnergyCost) {
            env.log.warning(`孵化所用能量大于房间最大孵化能量 ${spawnEnergyCost} > ${room.energyCapacityAvailable}`)
            return false
        }

        return true
    }

    /**
     * 新增动员任务
     *
     * @param type 要孵化的小队类型
     * @param needBoost 是否需要 boost
     * @param targetFlagName 要进攻的旗帜名
     * @param squadCode 小队代号
     */
    const addMobilize = function (type: SquadType, needBoost = true, targetFlagName?: string, squadCode?: string): boolean {
        if (!checkMobilizeAbility(env.getRoomByName(spawnRoomName), needBoost, type)) return false

        let confirmSquadCode = squadCode
        // 没有指定小队代号的话就挑选一个默认的
        if (!confirmSquadCode) {
            const { squads, mobilizes } = getWarMemory()
            const usedSquadCode = [...Object.keys(squads), ...mobilizes.map(task => task.squadCode)]
            confirmSquadCode = DEFAULT_SQUAD_CODE.find(code => !usedSquadCode.includes(code))
            if (!confirmSquadCode) {
                env.log.warning('默认小队代号已用尽，请手动指定小队代号')
                return
            }
        }

        let confirmTarget = targetFlagName
        // 目标旗帜未确认的话就使用小队代号的首字母当作旗帜名
        if (!confirmTarget) confirmTarget = confirmSquadCode[0]

        env.log.success(`小队 ${confirmSquadCode} 已被添加至动员队列，小队类型 ${env.colorful.yellow(SquadTypeName[type])} 进攻旗帜名 ${confirmTarget}`)
        db.insertMobilizeTask(type, needBoost, confirmTarget, confirmSquadCode)

        return true
    }

    /**
     * 尝试从散兵里重建小队
     */
    const regroup = function () {
        const { alonedCreep } = getWarMemory()
        if (!alonedCreep || alonedCreep.length <= 0) return
        console.log('尝试重组小队！', alonedCreep)
        const aliveCreeps = alonedCreep.map(env.getCreepByName).filter(Boolean)
        db.updateAlonedCreep(aliveCreeps.map(c => c.name))
    }

    /**
     * 返回当前战争进程状态
     */
    const showState = function () {
        const squadState = squadCluster.showState()
        const mobilizeState = mobilizeManager.showState()
        const { mobilizes } = getWarMemory()

        const logs = [env.colorful.blue(`${warCode} 战争情况`, true)]

        if (squadState.length > 0) {
            logs.push(
                '战斗小队',
                squadState.map(s => '- ' + s).join('\n')
            )
        }
        else logs.push(env.colorful.yellow('暂无战斗小队'))

        if (Object.keys(mobilizes).length > 0) {
            logs.push(
                '动员任务',
                env.colorful.green('● ') + mobilizeState,
                ...Object.values(mobilizes).slice(1).map(task => {
                    return env.colorful.yellow('●') + ` [小队代号] ${task.squadCode} [小队类型] ${SquadTypeName[task.squadType]}`
                })
            )
        }
        else logs.push(env.colorful.yellow('暂无动员任务'))

        return logs.join('\n')
    }

    /**
     * 终止战争
     * 当战争进行中时会切换至终止模式，当战争处于其他模式时会彻底删除战争
     *
     * @returns [是否真正关闭, 输出日志]
     */
    const closeWar = function (): [boolean, string] {
        const memory = getWarMemory()
        // 无论暂停战争还是关闭战争，都需要移除动员任务
        // 不然可能出现动员任务占用着 spawn 和 lab 但是什么都不干的问题
        mobilizeManager.close()

        if (memory.state === WarState.Progress) {
            memory.state = WarState.Aborted
            const logContent = `战争 ${warCode} 已切换至终止模式，不再孵化新单位，当前存在的单位将继续作战\n` +
            `- 执行 ${env.colorful.yellow('war.continue')} 来恢复战争\n` +
            `- 再次执行 ${env.colorful.yellow('war.close')} 来彻底关闭战争（将会移除所有单位和动员任务）\n`

            return [false, logContent]
        }

        // 释放所有下属资源
        squadCluster.map(squad => squad.close())
        env.getFlagByName(memory.code)?.remove()

        context.removeSelf()
        return [true, `战争 ${warCode} 已彻底移除`]
    }

    /**
     * 从其他状态中恢复战争
     */
    const continueWar = function () {
        const memory = getWarMemory()
        if (memory.state === WarState.Progress) {
            return `战争 ${warCode} 正在执行`
        }
        memory.state = WarState.Progress
        return `战争 ${warCode} 已重新启动`
    }

    /**
     * 执行战争行动
     */
    const run = function () {
        const { state } = getWarMemory()

        const targetFlag = env.getFlagByName(warCode)
        if (!targetFlag) env.log.error(`找不到名称为 ${warCode} 的战争目标旗帜，请重新放置`)
        if (state !== WarState.Success && targetFlag.room && hasMyCreep(targetFlag)) db.updateState(WarState.Success)

        // 战争正常进行时才会进行动员任务
        if (state === WarState.Progress) mobilizeManager.run()
        squadCluster.run()

        regroup()
    }

    return { warCode, squads: squadCluster, run, showState, addSquad, closeWar, continueWar, addMobilize }
}

export type WarManager = ReturnType<typeof createWarManager>
