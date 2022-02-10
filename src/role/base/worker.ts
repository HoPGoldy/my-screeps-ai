// import { bodyConfigs, createBodyGetter } from '../bodyUtils'
// import { CreepConfig, CreepRole } from '../types/role'

// /**
//  * 工人，运营单位
//  * 负责采集能量、升级、维修、建造等消耗能量的工作
//  * 任务处理逻辑定义在 modules/roomTask/work/actions 中
//  */
// const worker: CreepConfig<CreepRole.Worker> = {
//     isNeed: (room, preMemory, creepName) => {
//         // 如果自己被炒鱿鱼了就不再孵化
//         if (room.work.haveCreepBeenFired(creepName)) {
//             room.work.removeCreep(creepName)
//             return false
//         }
//         // 否则一直孵化
//         return true
//     },
//     source: creep => {
//         const { workRoom } = creep.memory.data
//         return Game.rooms[workRoom]?.work.getWork(creep).source()
//     },
//     target: creep => {
//         const { workRoom } = creep.memory.data
//         return Game.rooms[workRoom]?.work.getWork(creep).target()
//     },
//     bodys: (room, spawn) => createBodyGetter(bodyConfigs.worker)(room, spawn)
// }

// export default worker
