import { PB_HARVESTE_STATE } from 'setting'
import { calcBodyPart } from 'utils'

/**
 * PowerBank 运输单位
 * 搬运 PowerBank Ruin 中的 power, 请在 8 级时生成
 * @see doc "../doc/PB 采集小组设计案"
 * 
 * @param spawnRoom 出生房间名称
 * @param sourceFlagName 旗帜的名称 (插在 PowerBank 上)
 */
const pbCarrier: CreepConfig<'pbCarrier'> = {
    // carrier 并不会重复生成
    isNeed: () => false,
    // 移动到目标三格之内就算准备完成
    prepare: creep => {
        const targetFlag = Game.flags[creep.memory.data.sourceFlagName]
        if (!targetFlag) {
            creep.suicide()
            return false
        }

        creep.goTo(targetFlag.pos)

        return creep.pos.inRangeTo(targetFlag.pos, 3)
    },
    source: creep => {
        const targetFlag = Game.flags[creep.memory.data.sourceFlagName]
        if (!targetFlag) {
            creep.suicide()
            return false
        }
        // 没到搬运的时候就先待命
        if (targetFlag.memory.state !== PB_HARVESTE_STATE.TRANSFER) return false
        // 到行动阶段了就过去
        creep.goTo(targetFlag.pos)

        // 到房间里再进行下一步操作
        if (creep.room.name !== targetFlag.pos.roomName) return false

        // 获取 powerBank 的废墟
        const powerbankRuin: Ruin = targetFlag.pos.lookFor(LOOK_RUINS)[0]

        // 如果 pb 废墟还存在
        if (powerbankRuin) {
            if (creep.withdraw(powerbankRuin, RESOURCE_POWER) === OK) return true
        }
        // 如果废墟没了就从地上捡
        else {
            const power = targetFlag.pos.lookFor(LOOK_RESOURCES)[0]
            if (power) {
                if (creep.pickup(power) === OK) return true
            }
            // 地上也没了那就上天堂
            else {
                creep.suicide()
                targetFlag.remove()
            }
        }
    },
    target: creep => {
        const { spawnRoom: spawnRoomName, sourceFlagName } = creep.memory.data

        // 获取资源运输目标房间并兜底
        const room = Game.rooms[spawnRoomName]
        if (!room || !room.terminal) {
            creep.log(`找不到 terminal`, 'yellow')
            return false
        }

        // 存放资源
        const result = creep.transfer(room.terminal, RESOURCE_POWER)
        // 存好了就直接自杀并移除旗帜
        if (result === OK) {
            creep.suicide()

            const targetFlag = Game.flags[sourceFlagName]
            if (!targetFlag) return false

            targetFlag.remove()
            // 通知 terminal 进行 power 平衡
            room.terminal.balancePower()

            return true
        }
        else if (result === ERR_NOT_IN_RANGE) creep.goTo(room.terminal.pos)
    },
    bodys: () => calcBodyPart({ [CARRY]: 32, [MOVE]: 16 })
}

export default pbCarrier