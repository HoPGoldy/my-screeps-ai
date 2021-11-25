import { calcBodyPart, Color } from '@/utils'
import { CreepConfig, CreepRole, PbHarvestState } from '../types/role'

/**
 * PowerBank 运输单位
 * 搬运 PowerBank Ruin 中的 power, 请在 8 级时生成
 * @see doc "../doc/PB 采集小组设计案"
 *
 * @param sourceFlagName 旗帜的名称 (插在 PowerBank 上)
 */
const pbCarrier: CreepConfig<CreepRole.PbCarrier> = {
    // carrier 并不会重复生成
    isNeed: (room, preMemory) => {
        const targetFlag = Game.flags[preMemory.data.sourceFlagName]
        targetFlag?.remove()

        return false
    },
    // 移动到目标三格之内就算准备完成
    prepare: creep => {
        const targetFlag = Game.flags[creep.memory.data.sourceFlagName]
        if (!targetFlag) {
            creep.suicide()
            return false
        }

        creep.goTo(targetFlag.pos, { checkTarget: false })

        return creep.pos.inRangeTo(targetFlag.pos, 3)
    },
    source: creep => {
        const targetFlag = Game.flags[creep.memory.data.sourceFlagName]
        if (!targetFlag) {
            creep.suicide()
            return false
        }
        // 没到搬运的时候就先待命
        if (targetFlag.memory.state !== PbHarvestState.Transfer) return false
        // 到行动阶段了就过去
        creep.goTo(targetFlag.pos, { checkTarget: false })

        // 到房间里再进行下一步操作
        if (creep.room.name !== targetFlag.pos.roomName) return false

        // 获取 powerBank 的废墟
        const powerbankRuin = targetFlag.pos.lookFor(LOOK_RUINS)[0]

        // 如果 pb 废墟还存在
        if (powerbankRuin) {
            if (creep.withdraw(powerbankRuin, RESOURCE_POWER) === OK) return true
        }
        // 如果废墟没了就从地上捡
        else {
            const power = targetFlag.pos.lookFor(LOOK_RESOURCES)[0]
            return power && creep.pickup(power) === OK
        }
    },
    target: creep => {
        const { spawnRoom: spawnRoomName } = creep.memory

        // 获取资源运输目标房间并兜底
        const room = Game.rooms[spawnRoomName]
        if (!room || !room.terminal) {
            creep.log('找不到 terminal', Color.Yellow)
            return false
        }

        // 存放资源
        const result = creep.transferTo(room.terminal, RESOURCE_POWER)
        // 存好了就直接自杀并移除旗帜
        if (result === OK) {
            creep.suicide()
            // 通知 terminal 进行 power 平衡
            room.myTerminal.balancePower()

            return true
        }
    },
    bodys: () => calcBodyPart([[CARRY, 32], [MOVE, 16]])
}

export default pbCarrier
