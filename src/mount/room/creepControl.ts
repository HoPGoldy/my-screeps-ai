/**=
 * 对房间内的 creep 进行管理
 */

import RoomConsole from "./console"
import { releaseCreep } from "modules/autoPlanning/planCreep"
import { creepApi } from "modules/creepController"
import { DEFAULT_FLAG_NAME } from "setting"

export default class CreepControl extends RoomConsole {
    /**
     * 给本房间发布或重新规划指定的 creep 角色
     * @param role 要发布的 creep 角色
     * @param number 要发布的数量，部分角色会无视该参数
     */
    releaseCreep(role: BaseRoleConstant | AdvancedRoleConstant, number: number = 1): ScreepsReturnCode { 
        return releaseCreep(this, role, number)
    }

    /**
     * 发布外矿角色组
     * 
     * @param remoteRoomName 要发布 creep 的外矿房间
     */
    public addRemoteCreepGroup(remoteRoomName: string): void {
        const sourceFlagsName = [ `${remoteRoomName} source0`, `${remoteRoomName} source1` ]

        // 添加对应数量的外矿采集者
        sourceFlagsName.forEach((flagName, index) => {
            if (!(flagName in Game.flags)) return

            creepApi.add(`${remoteRoomName} remoteHarvester${index}`, 'remoteHarvester', {
                sourceFlagName: flagName,
                spawnRoom: this.name,
                targetId: this.memory.remote[remoteRoomName].targetId
            }, this.name)
        })

        this.addRemoteReserver(remoteRoomName)
    }

    /**
     * 发布房间预定者
     * 
     * @param remoteRoomName 要预定的外矿房间名
     * @param single 为 false 时将允许为一个房间发布多个预定者，为 true 时可以执行自动发布
     */
    public addRemoteReserver(remoteRoomName, single: boolean = true): void {
        // 添加外矿预定者
        const reserverName = `${remoteRoomName} reserver${single ? '' : Game.time}`
        if (!creepApi.has(reserverName)) creepApi.add(reserverName, 'reserver', {
            targetRoomName: remoteRoomName
        }, this.name)
    }

    /**
     * 给本房间签名
     * 
     * @param content 要签名的内容
     */
    public sign(content: string): string {
        const creepName = `${this.name} signer`
        const creep = Game.creeps[creepName]
        // 如果有显存的签名单位就直接签名
        if (creep) {
            (creep.memory.data as RemoteDeclarerData).signText = content
            return `已将 ${creepName} 的签名内容修改为：${content}`
        }
        // 否则就发布一个
        creepApi.add(creepName, 'signer', {
            targetRoomName: this.name,
            signText: content
        }, this.name)

        return `已发布 ${creepName}, 签名内容为：${content}`
    }

    /**
     * 发布支援角色组
     * 
     * @param remoteRoomName 要支援的房间名
     */
    public addRemoteHelper(remoteRoomName): void {
        const room = Game.rooms[remoteRoomName]

        if (!room) return this.log(`目标房间没有视野，无法发布支援单位`, '', 'yellow')

        // 发布 upgrader 和 builder
        creepApi.add(`${remoteRoomName} RemoteUpgrader`, 'remoteUpgrader', {
            targetRoomName: remoteRoomName,
            sourceId: room.sources[0].id
        }, this.name)
        creepApi.add(`${remoteRoomName} RemoteBuilder`, 'remoteBuilder', {
            targetRoomName: remoteRoomName,
            sourceId: room.sources.length >= 2 ? room.sources[1].id : room.sources[0].id
        }, this.name)
    }

    /**
     * 发布 pbCarrier 小组
     * 由 pbAttacker 调用
     * 
     * @param flagName powerBank 上的旗帜名
     * @param number 孵化几个 carrier
     */
    public spawnPbCarrierGroup(flagName: string, number: number): void {
        // 如果已经有人发布过了就不再费事了
        if (creepApi.has(`${flagName} carrier0`)) return
        
        for (let i = 0; i < number; i++) {
            creepApi.add(`${flagName} carrier${i}`, 'pbCarrier', {
                sourceFlagName: flagName,
                spawnRoom: this.name
            }, this.name)
        }
    }

    /**
     * 移除 pb 采集小组配置项
     * @param attackerName 攻击单位名称
     * @param healerName 治疗单位名称
     */
    public removePbHarvesteGroup(attackerName: string, healerName: string): void {
        creepApi.remove(attackerName)
        creepApi.remove(healerName)
    }

    /**
     * 孵化 boost 进攻一体机
     * 
     * @param bearTowerNum 抗塔等级 0-6，等级越高扛伤能力越强，伤害越低
     * @param targetFlagName 目标旗帜名称
     * @param keepSpawn 是否持续生成
     */
    public spawnRangedAttacker(bearTowerNum: 0 | 1 | 3 | 5 | 2 | 4 | 6 = 6, targetFlagName: string = DEFAULT_FLAG_NAME.ATTACK, keepSpawn: boolean = false): string {
        if (!this.memory.boost) return `发布失败，未启动 Boost 进程，执行 ${this.name}.war() 来启动战争状态`
        if (this.memory.boost.state !== 'waitBoost') return `无法发布，Boost 材料未准备就绪`

        const creepName = `${this.name} apocalypse ${Game.time}`
        creepApi.add(creepName, 'apocalypse', {
            targetFlagName: targetFlagName || DEFAULT_FLAG_NAME.ATTACK,
            bearTowerNum,
            keepSpawn
        }, this.name)

        return `已发布进攻一体机 [${creepName}] [扛塔等级] ${bearTowerNum} [进攻旗帜名称] ${targetFlagName} ${keepSpawn ? '' : '不'}持续生成，GoodLuck Commander`
    }

    /**
     * 孵化 boost 拆墙小组
     * 
     * @param targetFlagName 进攻旗帜名称
     * @param keepSpawn 是否持续生成
     */
    public spawnDismantleGroup(targetFlagName: string = '', keepSpawn: boolean = false): string {
        if (!this.memory.boost) return `发布失败，未启动 Boost 进程，执行 ${this.name}.war() 来启动战争状态`
        if (this.memory.boost.state !== 'waitBoost') return `无法发布，Boost 材料未准备就绪`

        const dismantlerName = `${this.name} dismantler ${Game.time}`
        const healerName = `${this.name} doctor ${Game.time}`
        creepApi.add(dismantlerName, 'boostDismantler', {
            targetFlagName: targetFlagName || DEFAULT_FLAG_NAME.ATTACK,
            healerName,
            keepSpawn
        }, this.name)
        creepApi.add(healerName, 'boostDoctor', {
            creepName: dismantlerName,
            keepSpawn
        }, this.name)

        return `已发布拆墙小组，正在孵化，GoodLuck Commander`
    }

    /**
     * 孵化基础进攻单位
     * 
     * @param targetFlagName 进攻旗帜名称
     * @param num 要孵化的数量
     */
    public spwanSoldier(targetFlagName: string = '', num: number = 1) {
        if (num <=0 || num > 10) num = 1

        for (let i = 0; i < num; i++) {
            creepApi.add(`${this.name} soldier ${Game.time}-${i}`, 'soldier', {
                targetFlagName: targetFlagName || DEFAULT_FLAG_NAME.ATTACK,
                keepSpawn: false
            }, this.name)
        }

        return `已发布 soldier*${num}，正在孵化`
    }

    /**
     * 孵化基础拆除单位
     * 一般用于清除中立房间中挡路的墙壁
     * 
     * @param targetFlagName 进攻旗帜名称
     * @param num 要孵化的数量
     * @param keepSpawn 是否持续生成
     */
    public spwanDismantler(targetFlagName: string = '', num: number = 2, keepSpawn: boolean = false) {
        if (num <=0 || num > 10) num = 1

        for (let i = 0; i < num; i++) {
            creepApi.add(`${this.name} dismantler ${Game.time}-${i}`, 'dismantler', {
                targetFlagName: targetFlagName || DEFAULT_FLAG_NAME.ATTACK,
                keepSpawn
            }, this.name)
        }

        return `已发布 dismantler*${num}，正在孵化`
    }

    /**
     * 孵化掠夺者
     * 
     * @param sourceFlagName 要搜刮的建筑上插好的旗帜名
     * @param targetStructureId 要把资源存放到的建筑 id
     */
    public spawnReiver(sourceFlagName: string = '', targetStructureId: string = ''): string {
        if (!targetStructureId && !this.terminal) return `[${this.name}] 发布失败，请填写要存放到的建筑 id`
        const reiverName = `${this.name} reiver ${Game.time}`
        creepApi.add(reiverName, 'reiver', {
            flagName: sourceFlagName || DEFAULT_FLAG_NAME.REIVER,
            targetId: targetStructureId || this.terminal.id
        }, this.name)

        return `[${this.name}] 掠夺者 ${reiverName} 已发布, 目标旗帜名称 ${sourceFlagName || DEFAULT_FLAG_NAME.REIVER}, 将搬运至 ${targetStructureId ? targetStructureId : this.name + ' Terminal'}`
    }
}