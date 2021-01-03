import { bodyConfigs } from '../bodyConfigs'
import { createBodyGetter } from 'utils'

/**
 * 房间物流运输者
 * 执行 ROOM_TRANSFER_TASK 中定义的任务
 * 任务处理逻辑定义在 transferTaskOperations 中
 */
const worker: CreepConfig<'worker'> = {
    source: creep => {
        const { workRoom } = creep.memory.data
        return Game.rooms[workRoom]?.work.getWork(creep).source()
    },
    target: creep => {
        const { workRoom } = creep.memory.data
        return Game.rooms[workRoom]?.work.getWork(creep).target()
    },
    bodys: createBodyGetter(bodyConfigs.worker)
}

export default worker