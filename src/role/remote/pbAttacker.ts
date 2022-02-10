// import { removeCreep } from '@/modulesGlobal/creep/utils'
// import { calcBodyPart } from '@/utils'
// import { CreepConfig, CreepRole, PbHarvestState } from '../types/role'

// /**
//  * pbAttacker 移除自身采集小组并自杀的封装
//  *
//  * @param creep pbAttacker
//  * @param healerName 治疗单位名称
//  * @param spawnRoomName 出生房间名
//  * @returns 是否移除成功
//  */
// const removeSelfGroup = function (creep: Creep, healerName: string, spawnRoomName: string): boolean {
//     // 移除自己和 heal 的配置项
//     const spawnRoom = Game.rooms[spawnRoomName]
//     if (!spawnRoom) {
//         creep.say('家呢？')
//         return false
//     }

//     // 移除角色组
//     removeCreep(creep.name, { immediate: true })
//     removeCreep(healerName, { immediate: true })
// }

// /**
//  * PowerBank 攻击单位
//  * 移动并攻击 powerBank, 请在 8 级时生成
//  * @see doc "../doc/PB 采集小组设计案"
//  *
//  * @property {} sourceFlagName 旗帜名，要插在 powerBank 上
//  */
// const pbAttacker: CreepConfig<CreepRole.PbAttacker> = {
//     target: creep => {
//     },
//     bodys: () => calcBodyPart([[ATTACK, 20], [MOVE, 20]])
// }

// export default pbAttacker
