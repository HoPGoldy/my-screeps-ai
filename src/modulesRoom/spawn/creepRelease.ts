// import { removeCreep } from '@/modulesGlobal/creep'
// import { BASE_ROLE_LIMIT } from './constants'
// import RoomSpawnController from './controllerOld'
// import { GetName } from './nameGetter'
// import { BaseUnitLimit, BaseUnits, RoomBaseUnitLimit } from './types'
// import { CreepRole, RoleCreep } from '@/role/types/role'
// import { removeCreepCantRespawn } from '@/modulesGlobal/creep/utils'
// import { Color, log, DEFAULT_FLAG_NAME } from '@/utils'
// import { getSource } from '@/mount/room/shortcut'

// /**
//  * creep 发布工具
//  * 基于 RoomSpawnController 的封装
//  */
// export default class RoomCreepRelease {
//     readonly spawner: RoomSpawnController

//     constructor (spawner: RoomSpawnController) {
//         this.spawner = spawner
//     }

//     /**
//      * 变更基地运维单位数量
//      *
//      * @param type 要更新的单位类别，工人 / 搬运工
//      * @param adjust 要增减的数量，为负代表减少
//      */
//     public changeBaseUnit (type: BaseUnits, adjust: number): void {
//         const { room } = this.spawner
//         // 单位隶属的任务模块
//         const taskController = type === CreepRole.Worker ? room.work : room.transport
//         // 获取对应的最大数量和最小数量
//         const { MIN, MAX } = (room.memory.baseUnitLimit || {})[type] || BASE_ROLE_LIMIT[type]

//         // 按照数量上限找到所有本房间的单位，注意，这里的 allUnits 有空子项存在
//         const allUnits = Array.from({ length: MAX }).map((_, index) => {
//             return Game.creeps[GetName[type](room.name, index)]
//         })
//         // 找到所有活着的、没有被炒鱿鱼的单位
//         const aliveUnit = allUnits.filter(Boolean)

//         // 计算真实的调整数量
//         const realAdjust = this.clacRealAdjust(adjust, aliveUnit.length, MIN, MAX)

//         const removeWhenDiedCreep: string[] = []
//         const keepWhenDiedCreep: string[] = []
//         const newSpawnCreep: string[] = []

//         // 要增加单位
//         if (realAdjust >= 0) {
//             let remainingAdjust = realAdjust

//             // 首先遍历所有活着的单位，如果被炒鱿鱼了就解除炒鱿鱼
//             for (const creep of allUnits) {
//                 if (remainingAdjust <= 0) break
//                 if (!creep || !taskController.haveCreepBeenFired(creep.name)) continue

//                 taskController.unfireCreep(creep.name)
//                 removeCreepCantRespawn(creep)
//                 keepWhenDiedCreep.push(creep.name)
//                 remainingAdjust -= 1
//             }

//             // 在遍历所有不存在的单位，然后用对应的名字发布 creep
//             for (const index in allUnits) {
//                 if (remainingAdjust <= 0) break
//                 if (allUnits[index]) continue

//                 const creepName = GetName[type](room.name, index)
//                 this.spawner.addTask(creepName, type, { workRoom: room.name })
//                 newSpawnCreep.push(creepName)
//                 remainingAdjust -= 1
//             }
//         }
//         else {
//             // 从末尾开始炒鱿鱼，注意这里的 realAdjust 是负数，所以应该用 +
//             // 注意这里没有事先剔除掉被炒鱿鱼的单位，因为此时被炒鱿鱼的单位还在工作
//             // 所以工作模块给出的期望实际上是包括这些单位在内的，如果此时将其剔除掉之后再进行炒鱿鱼的话，就会炒掉过多的人
//             aliveUnit.slice(aliveUnit.length + realAdjust).forEach(creep => {
//                 taskController.fireCreep(creep.name)
//                 removeCreep(creep.name)
//                 removeWhenDiedCreep.push(creep.name)
//             })
//         }

//         if (realAdjust !== 0) {
//             let logContent = `${type} ${realAdjust > 0 ? '+' : ''}${realAdjust} ` +
//                 `[上/下限] ${MAX}/${MIN} [当前数量] ${aliveUnit.length} [调整]`

//             if (removeWhenDiedCreep.length > 0) logContent += ` 将在死亡后移除 ${removeWhenDiedCreep.join(',')}`
//             if (keepWhenDiedCreep.length > 0) logContent += ` 将在死亡后继续孵化 ${keepWhenDiedCreep.join(',')}`
//             if (newSpawnCreep.length > 0) logContent += ` 新孵化 ${newSpawnCreep.join(',')}`

//             log(logContent, room.name)
//         }
//     }

//     /**
//      * 获取实际调整数量
//      * 保证最少有 MIN 人，最多有 MAX 人
//      *
//      * @param expect 期望的调整数量
//      * @param old 调整之前的数量
//      * @param min 最少数量
//      * @param max 最多数量
//      */
//     private clacRealAdjust (expect: number, old: number, min: number, max: number): number {
//         // 调整完的人数超过限制了，就增加到最大值
//         if (old + expect > max) return max - old
//         // 调整完了人数在正常区间，直接用
//         else if (old + expect >= min) return expect
//         // 调整值导致人数不够了，根据最小值调整
//         else return min - old
//     }

//     /**
//      * 设置基地运维角色数量
//      *
//      * @param type 要设置的单位角色
//      * @param limit 设置的限制，设置为空来使用默认配置
//      */
//     public setBaseUnitLimit (type: BaseUnits, limit?: Partial<BaseUnitLimit>): void {
//         if (!limit && this.spawner.room.memory.baseUnitLimit) {
//             delete this.spawner.room.memory.baseUnitLimit[type]
//             return
//         }

//         // 获取当前房间的设置
//         const existLimit: RoomBaseUnitLimit = this.spawner.room.memory.baseUnitLimit || BASE_ROLE_LIMIT
//         // 更新配置
//         const realLimit = _.defaults(limit, existLimit[type], BASE_ROLE_LIMIT[type])
//         // 把新配置覆写保存进内存
//         this.spawner.room.memory.baseUnitLimit = _.defaults({ [type]: realLimit }, existLimit)
//     }

//     /**
//      * 发布外矿采集单位
//      *
//      * @param remoteRoomName 要发布 creep 的外矿房间
//      */
//     public remoteHarvester (remoteRoomName: string, remoteSourceId: Id<Source>): OK {
//         this.spawner.addTask(
//             GetName.remoteHarvester(remoteRoomName, remoteSourceId),
//             CreepRole.RemoteHarvester,
//             {
//                 roomName: remoteRoomName,
//                 sourceId: remoteSourceId
//             }
//         )

//         this.remoteReserver(remoteRoomName)

//         return OK
//     }

//     /**
//      * 发布房间预定者
//      *
//      * @param targetRoomName 要预定的外矿房间名
//      */
//     public remoteReserver (targetRoomName: string): void {
//         this.spawner.addTask(
//             GetName.reserver(targetRoomName),
//             CreepRole.Reserver,
//             { targetRoomName }
//         )
//     }

//     /**
//      * 给本房间签名
//      *
//      * @param content 要签名的内容
//      * @param targetRoomName 要签名到的房间名（默认为本房间）
//      */
//     public sign (content: string, targetRoomName: string = undefined): string {
//         const { room } = this.spawner
//         const creepName = GetName.signer(room.name)
//         const creep = Game.creeps[creepName]

//         // 如果有活着的签名单位就直接签名
//         if (assertSigner(creep)) {
//             creep.memory.data.signText = content
//             return `已将 ${creepName} 的签名内容修改为：${content}`
//         }

//         // 否则就发布一个
//         this.spawner.addTask(creepName, CreepRole.Signer, {
//             targetRoomName: targetRoomName || room.name,
//             signText: content
//         })

//         return `已发布 ${creepName}, 签名内容为：${content}`
//     }

//     /**
//      * 发布支援角色组
//      *
//      * @param remoteRoomName 要支援的房间名
//      */
//     public remoteHelper (remoteRoomName: string): void {
//         const room = Game.rooms[remoteRoomName]
//         if (!room) {
//             log('目标房间没有视野，无法发布支援单位', this.spawner.room.name + ' CreepRelease', Color.Yellow)
//             return
//         }
//         const source = getSource(room)

//         // 发布 upgrader 和 builder
//         this.spawner.addTask(
//             GetName.remoteUpgrader(remoteRoomName),
//             CreepRole.RemoteUpgrader,
//             {
//                 targetRoomName: remoteRoomName,
//                 sourceId: source[0].id
//             }
//         )

//         this.spawner.addTask(
//             GetName.remoteBuilder(remoteRoomName),
//             CreepRole.RemoteBuilder,
//             {
//                 targetRoomName: remoteRoomName,
//                 sourceId: source.length >= 2 ? source[1].id : source[0].id
//             }
//         )
//     }

//     /**
//      * 孵化掠夺者
//      *
//      * @param sourceFlagName 要搜刮的建筑上插好的旗帜名
//      * @param targetStructureId 要把资源存放到的建筑 id
//      */
//     public reiver (sourceFlagName = '', targetStructureId: Id<AnyStoreStructure> = undefined): string {
//         const { room } = this.spawner
//         if (!targetStructureId && !room.terminal) return `[${room.name}] 发布失败，请填写要存放到的建筑 id`

//         const reiverName = GetName.reiver(room.name)

//         this.spawner.addTask(reiverName, CreepRole.Reiver, {
//             flagName: sourceFlagName || DEFAULT_FLAG_NAME.REIVER,
//             targetId: targetStructureId || room.terminal.id
//         })

//         return `[${room.name}] 掠夺者 ${reiverName} 已发布, 目标旗帜名称 ${sourceFlagName || DEFAULT_FLAG_NAME.REIVER}, 将搬运至 ${targetStructureId || room.name + ' Terminal'}`
//     }
// }

// /***
//  * 断言一个 creep 是否为签名单位
//  */
// const assertSigner = function (creep: Creep): creep is RoleCreep<CreepRole.Signer> {
//     return creep.memory.role === CreepRole.Signer
// }
