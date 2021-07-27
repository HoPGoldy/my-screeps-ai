import { bodyConfigs, specialBodyConfig, createBodyGetter } from '../bodyUtils'
import { CreepConfig, CreepRole } from '../types/role'

/**
 * 工人，运营单位
 * 负责采集能量、升级、维修、建造等消耗能量的工作
 * 任务处理逻辑定义在 modules/roomTask/work/actions 中
 */
const worker: CreepConfig<CreepRole.Worker> = {
    isNeed: (room, preMemory, creepName) => {
        // 如果自己被炒鱿鱼了就不再孵化
        if (room.work.haveCreepBeenFired(creepName)) {
            room.work.removeCreep(creepName)
            return false
        }
        // 普通体型的话就一直孵化，特殊体型的话如果还有要做的任务就继续孵化
        return !preMemory.bodyType || !!preMemory.taskKey
    },
    prepare: creep => {
        creep.memory.bodyType = creep.memory.data.bodyType
        return true
    },
    source: creep => {
        const { workRoom } = creep.memory.data
        return Game.rooms[workRoom]?.work.getWork(creep).source()
    },
    target: creep => {
        const { workRoom } = creep.memory.data
        return Game.rooms[workRoom]?.work.getWork(creep).target()
    },
    bodys: (room, spawn, data) => {
        // 指定了特殊身体部件的话就生成对应的
        if (data.bodyType) return specialBodyConfig[data.bodyType](room, spawn)
        // 否则就使用默认的身体部件
        return createBodyGetter(bodyConfigs.worker)(room, spawn)
    }
}

export default worker