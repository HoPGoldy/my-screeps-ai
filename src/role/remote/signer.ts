// import { CreepConfig, CreepRole } from '../types/role'

// /**
//  * 签名者
//  * 会先抵达指定房间, 然后执行签名
//  *
//  * @param targetRoomName 要签名的目标房间名
//  * @param signText 要签名的内容
//  */
// const signer: CreepConfig<CreepRole.Signer> = {
//     isNeed: () => false,
//     target: creep => {
//         const { targetRoomName, signText } = creep.memory.data
//         if (creep.room.name === targetRoomName) {
//             if (creep.signController(creep.room.controller, signText) === ERR_NOT_IN_RANGE) {
//                 creep.goTo(creep.room.controller.pos, { checkTarget: false })
//             }
//         }
//         else creep.goTo(new RoomPosition(25, 25, targetRoomName), { checkTarget: false })

//         return false
//     },
//     bodys: () => [MOVE]
// }

// export default signer
