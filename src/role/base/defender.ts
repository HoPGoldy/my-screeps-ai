// import { calcBodyPart } from '@/utils'
// import { CreepConfig, CreepRole } from '../types/role'

// const defender: CreepConfig<CreepRole.Defender> = {
//     // 委托 controller 判断房间内是否有威胁
//     isNeed: (room, preMemory) => {
//         const needSpawn = room.towerController.checkEnemyThreat(room.towerController.findEnemy())
//         const { boostTaskId } = preMemory.data

//         // 如果威胁已经解除了，就不再孵化
//         if (!needSpawn && boostTaskId) {
//             room.labController.finishBoost(boostTaskId)
//             Game.notify(`[${room.name}][${Game.time}] 入侵威胁解除，已取消主动防御模式`)
//         }
//         // 还要打，续上
//         else room.labController.reloadBoostTask(boostTaskId)

//         return needSpawn
//     },
//     prepare: creep => {
//         const { boostTaskId } = creep.memory.data
//         if (!boostTaskId) return true

//         return creep.room.labController.boostCreep(creep, boostTaskId)
//     },
//     target: creep => {
//         const enemys = creep.room.towerController.findEnemy()
//         // 没有敌人就啥也不干
//         if (enemys.length <= 0) return false

//         // 从缓存中获取敌人
//         const enemy = creep.pos.findClosestByRange(enemys)
//         creep.say('💢')
//         // 防止一不小心出房间了
//         if ((enemy.pos.x !== 0 && enemy.pos.x !== 49 && enemy.pos.y !== 0 && enemy.pos.y !== 49) && !creep.pos.isNearTo(enemy.pos)) creep.moveTo(enemy.pos)

//         creep.attack(enemy)
//     },
// }

// export default defender
