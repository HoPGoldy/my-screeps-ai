// import { yellow, createHelp, getName } from '@/utils'

// /**
//  * 拓展模块的用户访问接口
//  */
// export default class RemoteConsole extends Room {
//     /**
//      * 拓展新外矿
//      */
//     public radd (remoteRoomName: string, sourceId: Id<Source>, targetId?: Id<AnyStoreStructure>): string {
//         let logs = `[${this.name} 外矿] `

//         const result = this.remote.add(remoteRoomName, sourceId, targetId)
//         if (result === ERR_INVALID_TARGET) logs += '拓展失败，无效的 targetId'
//         else logs += `拓展完成，已发布 remoteHarvester 及 reserver，能量将存放至 ${Game.getObjectById(result)}`

//         return logs
//     }

//     /**
//      * 移除外矿
//      */
//     public rremove (remoteRoomName: string, sourceId: Id<Source>): string {
//         let logs = `[${this.name} 外矿] `

//         const result = this.remote.remove(remoteRoomName, sourceId)
//         if (result === OK) logs += '外矿及对应采集单位已移除'
//         else if (result === ERR_NOT_FOUND) logs += '未找到对应外矿'

//         return logs
//     }

//     /**
//      * 占领新房间
//      */
//     public claim (targetRoomName: string, signText = ''): string {
//         this.remote.claim(targetRoomName, signText)

//         return `[${this.name} 拓展] 已发布 claimer，请保持关注，支援单位会在占领成功后自动发布。` +
//         `你可以在目标房间中新建名为 ${getName.flagBaseCenter(targetRoomName)} 的旗帜来指定基地中心。` +
//         '否则 claimer 将在占领后运行自动规划。'
//     }

//     /**
//      * 查看外矿状态
//      */
//     public rshow (): string {
//         const remoteList = this.remote.remoteList
//         if (remoteList.length <= 0) return `[${this.name} 拓展] 暂无外矿`

//         const logs: string[] = []
//         logs.push(...remoteList.map(info => {
//             let log = `[${info.remoteRoomName} source ${info.sourceId}] `
//             log += info.reharvestTick ? yellow(`暂停至 ${info.reharvestTick}`) : '采集中'
//             return log
//         }))

//         return logs.join('\n')
//     }

//     public rhelp (): string {
//         return createHelp({
//             name: '房间扩展控制台',
//             describe: '外矿管理及新房间扩张',
//             api: [
//                 {
//                     title: '占领新房间',
//                     describe: '孵化 CLAIM 单位前往占领房间，请确保拥有空余 GCL',
//                     params: [
//                         { name: 'targetRoomName', desc: '要占领的房间名' },
//                         { name: 'signText', desc: '【可选】给该房间控制器的签名' }
//                     ],
//                     functionName: 'claim'
//                 },
//                 {
//                     title: '添加新外矿',
//                     params: [
//                         { name: 'remoteRoomName', desc: '外矿所在房间' },
//                         { name: 'sourceId', desc: '要采集的 source id' },
//                         { name: 'targetId', desc: '[可选] 采集到的能量存放在哪个建筑里，不指定则会自行查找距离最近的建筑' }
//                     ],
//                     functionName: 'radd'
//                 },
//                 {
//                     title: '移除外矿',
//                     params: [
//                         { name: 'remoteRoomName', desc: '外矿所在房间' },
//                         { name: 'sourceId', desc: '要移除的 source id' }
//                     ],
//                     functionName: 'rremove'
//                 },
//                 {
//                     title: '查看本房间的外矿采集情况',
//                     functionName: 'rshow'
//                 }
//             ]
//         })
//     }
// }
