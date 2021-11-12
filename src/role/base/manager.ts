import { bodyConfigs, createBodyGetter } from '../bodyUtils'
import { CreepConfig, CreepRole } from '../types/role'

/**
 * 搬运工，运营单位
 * 负责填充 extension、spawn、tower、lab 等资源运输任务
 */
const manager: CreepConfig<CreepRole.Manager> = {
    isNeed: (room, preMemory, creepName) => {
        // 如果自己被炒鱿鱼了就不再孵化
        if (room.transport.haveCreepBeenFired(creepName)) {
            room.transport.removeCreep(creepName)
            return false
        }
        // 普通体型的话就一直孵化
        return true
    },
    target: creep => {
        const { workRoom } = creep.memory.data
        Game.rooms[workRoom]?.transport.doManagerWork(creep)
        return false
    },
    bodys: (room, spawn) => createBodyGetter(bodyConfigs.manager)(room, spawn)
}

export default manager