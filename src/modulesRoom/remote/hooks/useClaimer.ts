import { createRole } from '@/modulesRoom/unitControl'
import { createStaticBody } from '@/utils'
import { ClaimerMemory, RemoteContext } from '../types'

/**
 * 生成占领单位的名字
 */
export const getClaimerName = (targetRoomName: string) => `${targetRoomName} claimer`

/**
 * 生成占领单位的身体
 */
export const getClaimerBody = createStaticBody(
    [[MOVE, 1], [CLAIM, 1]],
    [[MOVE, 1], [CLAIM, 1]],
    [[MOVE, 1], [CLAIM, 1]],
    [[MOVE, 1], [CLAIM, 1]],
    [[MOVE, 2], [CLAIM, 2]],
    [[MOVE, 2], [CLAIM, 2]],
    [[MOVE, 3], [CLAIM, 3]],
    [[MOVE, 5], [CLAIM, 5]]
)

/**
 * 预定者
 * 这个角色并不会想太多，出生了就去预定，一辈子走完了就不再孵化
 * 外矿采集单位采集的时候会检查预定剩余时间，如果不够了会主动发布该角色
 */
export const useClaimer = function (context: RemoteContext) {
    const { claimerRole, getMemory, goTo, onCreepStageChange, addSpawnCallback, addSpawnTask, env } = context

    const claimer = createRole<ClaimerMemory>({
        getMemory: room => {
            const memory = getMemory(room)
            if (!memory.claimer) memory.claimer = {}
            return memory.claimer
        },
        runPrepare: (creep, memory) => {
            const { targetRoomName, center } = memory
            // 只要进入房间则准备结束
            if (creep.room.name !== targetRoomName) {
                goTo(creep, new RoomPosition(25, 25, targetRoomName))
                return false
            }
            // 进入房间之后运行基地选址规划
            else {
                // 用户没有指定旗帜时才会运行自动规划
                if (!center) memory.centerCandidates = creep.room.findBaseCenterPos().map(pos => [pos.x, pos.y])
                return true
            }
        },
        runTarget: (creep, memory, spawnRoom) => {
            const { targetRoomName, sign, center, centerCandidates } = memory
            // 获取控制器
            const controller = creep.room.controller
            if (!controller) {
                creep.say('控制器呢？')
                return false
            }

            // 绘制所有基地中央待选点位
            centerCandidates?.forEach(center => creep.room.visual.circle(...center))

            // 如果控制器不是自己或者被人预定的话就进行攻击
            if ((controller.owner && controller.owner.username !== creep.owner.username) || controller.reservation !== undefined) {
                if (creep.attackController(controller) === ERR_NOT_IN_RANGE) creep.moveTo(controller)
                return false
            }

            // 是中立控制器，进行占领
            const claimResult = creep.claimController(controller)
            if (claimResult === ERR_NOT_IN_RANGE) goTo(creep, controller.pos)
            else if (claimResult === OK) {
                env.log.success(`新房间 ${targetRoomName} 占领成功！已向源房间 ${spawnRoom.name} 请求支援单位`)

                // 占领成功，发布支援组
                spawnRoom.work.supportRoom(targetRoomName, 2)

                // 添加签名
                if (sign) creep.signController(controller, sign)

                // remoteUpgrader 找离 controller 近的，Build 找离 center 近的
                const flag = env.getFlagByName(center)
                // 用户已经指定了旗帜了
                if (flag) {
                    creep.room.setBaseCenter(flag.pos)
                    env.log.success(`使用玩家提供的基地中心点，位置 [${flag.pos.x}, ${flag.pos.y}]`)
                    // 移除旗帜
                    flag.remove()
                }
                // 运行基地选址确认
                else {
                    if (centerCandidates.length <= 0) {
                        env.log.warning(`房间中未找到有效的基地中心点，请放置旗帜并执行 Game.rooms.${creep.room.name}.setcenter('旗帜名')`)
                    }
                    else {
                        const result = creep.room.confirmBaseCenter()
                        if (result === ERR_NOT_FOUND) env.log.warning('新的基地中心点确认失败，请手动指定')
                        else env.log.success(`新的基地中心点已确认, 位置 [${result.x}, ${result.y}]`)
                    }
                }

                // 任务完成，一路顺风
                creep.suicide()
            }
            else if (claimResult === ERR_GCL_NOT_ENOUGH) creep.log('GCL 不足，无法占领')
            else creep.say(`占领 ${claimResult}`)
        },
        onCreepStageChange
    })

    addSpawnCallback(claimerRole, claimer.addUnit)

    /**
     * 发布占领单位
     *
     * @param room 哪个房间孵化
     * @param targetRoomName 要占领的房间
     */
    const releaseClaimer = function (room: Room, targetRoomName: string, sign?: string, center?: string) {
        const creepName = getClaimerName(targetRoomName)
        addSpawnTask(room, creepName, claimerRole, [TOUGH, MOVE, MOVE, CLAIM])
        claimer.registerUnit(creepName, { targetRoomName, sign, center }, room)
    }

    return { claimer, releaseClaimer }
}
