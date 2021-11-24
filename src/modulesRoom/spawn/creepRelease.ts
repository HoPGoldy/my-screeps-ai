import { removeCreep } from '@/modulesGlobal/creep'
import { BASE_ROLE_LIMIT } from './constant'
import RoomSpawnController from './controller'
import { GetName } from './nameGetter'
import { BaseUnitLimit, BaseUnits, RoomBaseUnitLimit } from './types'
import { SepicalBodyType } from '../taskWork/types'
import { Color, log } from '@/modulesGlobal/console/utils'
import { CreepRole, RoleCreep } from '@/role/types/role'
import { removeCreepCantRespawn } from '@/modulesGlobal/creep/utils'
import { StructureWithStore } from '@/utils'
import { DEFAULT_FLAG_NAME } from '@/utils/constants'

/**
 * creep 发布工具
 * 基于 RoomSpawnController 的封装
 */
export default class RoomCreepRelease {
    readonly spawner: RoomSpawnController

    constructor (spawner: RoomSpawnController) {
        this.spawner = spawner
    }

    /**
     * 发布采集单位
     * 固定一个 source 发布一个单位
     */
    public harvester (): OK | ERR_NOT_FOUND {
        const { name: roomName, source } = this.spawner.room;

        (source || []).forEach((source, index) => {
            this.spawner.addTask(GetName.harvester(roomName, index), CreepRole.Harvester, {
                useRoom: roomName,
                harvestRoom: roomName,
                sourceId: source.id
            })
        })

        return OK
    }

    /**
     * 变更基地运维单位数量
     *
     * @param type 要更新的单位类别，工人 / 搬运工
     * @param adjust 要增减的数量，为负代表减少
     * @param bodyType 在新增时要设置的特殊体型，减少数量时无效
     */
    public changeBaseUnit (type: BaseUnits, adjust: number, bodyType?: SepicalBodyType): void {
        const { room } = this.spawner
        // 单位隶属的任务模块
        const taskController = type === CreepRole.Worker ? room.work : room.transport
        // 获取对应的最大数量和最小数量
        const { MIN, MAX } = (room.memory.baseUnitLimit || {})[type] || BASE_ROLE_LIMIT[type]

        // 按照数量上限找到所有本房间的单位，注意，这里的 allUnits 有空子项存在
        const allUnits = Array.from({ length: MAX }).map((_, index) => {
            return Game.creeps[GetName[type](room.name, index)]
        })
        // 找到所有活着的、没有被炒鱿鱼的单位
        const aliveUnit = allUnits.filter(Boolean)

        // 计算真实的调整数量
        const realAdjust = this.clacRealAdjust(adjust, aliveUnit.length, MIN, MAX)

        const removeWhenDiedCreep: string[] = []
        const keepWhenDiedCreep: string[] = []
        const newSpawnCreep: string[] = []

        // 要增加单位
        if (realAdjust >= 0) {
            let remainingAdjust = realAdjust

            // 首先遍历所有活着的单位，如果被炒鱿鱼了就解除炒鱿鱼
            for (const creep of allUnits) {
                if (remainingAdjust <= 0) break
                if (!creep || !taskController.haveCreepBeenFired(creep.name)) continue

                taskController.unfireCreep(creep.name)
                removeCreepCantRespawn(creep)
                keepWhenDiedCreep.push(creep.name)
                remainingAdjust -= 1
            }

            // 在遍历所有不存在的单位，然后用对应的名字发布 creep
            for (const index in allUnits) {
                if (remainingAdjust <= 0) break
                if (allUnits[index]) continue

                const creepName = GetName[type](room.name, index)
                this.spawner.addTask(creepName, type, { workRoom: room.name, bodyType })
                newSpawnCreep.push(creepName)
                remainingAdjust -= 1
            }
        }
        else {
            // 从末尾开始炒鱿鱼，注意这里的 realAdjust 是负数，所以应该用 +
            // 注意这里没有事先剔除掉被炒鱿鱼的单位，因为此时被炒鱿鱼的单位还在工作
            // 所以工作模块给出的期望实际上是包括这些单位在内的，如果此时将其剔除掉之后再进行炒鱿鱼的话，就会炒掉过多的人
            aliveUnit.slice(aliveUnit.length + realAdjust).forEach(creep => {
                taskController.fireCreep(creep.name)
                removeCreep(creep.name)
                removeWhenDiedCreep.push(creep.name)
            })
        }

        if (realAdjust !== 0) {
            let logContent = `${type} 数量更新 [调整] ${realAdjust > 0 ? '+' : ''}${realAdjust} ` +
                `[上/下限] ${MAX}/${MIN} [当前数量] ${aliveUnit.length} `

            if (removeWhenDiedCreep.length > 0) logContent += `[将在死亡后移除] ${removeWhenDiedCreep.join(',')}`
            if (keepWhenDiedCreep.length > 0) logContent += `[将在死亡后继续孵化] ${keepWhenDiedCreep.join(',')}`
            if (newSpawnCreep.length > 0) logContent += `[新孵化] ${newSpawnCreep.join(',')}`

            log(logContent, room.name)
        }
    }

    /**
     * 获取实际调整数量
     * 保证最少有 MIN 人，最多有 MAX 人
     *
     * @param expect 期望的调整数量
     * @param old 调整之前的数量
     * @param min 最少数量
     * @param max 最多数量
     */
    private clacRealAdjust (expect: number, old: number, min: number, max: number): number {
        // 调整完的人数超过限制了，就增加到最大值
        if (old + expect > max) return max - old
        // 调整完了人数在正常区间，直接用
        else if (old + expect >= min) return expect
        // 调整值导致人数不够了，根据最小值调整
        else return min - old
    }

    /**
     * 发布元素矿采集单位
     */
    public miner (): void {
        const { name: roomName } = this.spawner.room

        this.spawner.addTask(GetName.miner(roomName), CreepRole.Miner, {
            workRoom: roomName
        })
    }

    /**
     * 设置基地运维角色数量
     *
     * @param type 要设置的单位角色
     * @param limit 设置的限制，设置为空来使用默认配置
     */
    public setBaseUnitLimit (type: BaseUnits, limit?: Partial<BaseUnitLimit>): void {
        if (!limit && this.spawner.room.memory.baseUnitLimit) {
            delete this.spawner.room.memory.baseUnitLimit[type]
            return
        }

        // 获取当前房间的设置
        const existLimit: RoomBaseUnitLimit = this.spawner.room.memory.baseUnitLimit || BASE_ROLE_LIMIT
        // 更新配置
        const realLimit = _.defaults(limit, existLimit[type], BASE_ROLE_LIMIT[type])
        // 把新配置覆写保存进内存
        this.spawner.room.memory.baseUnitLimit = _.defaults({ [type]: realLimit }, existLimit)
    }

    /**
     * 发布外矿采集单位
     *
     * @param remoteRoomName 要发布 creep 的外矿房间
     */
    public remoteHarvester (remoteRoomName: string, remoteSourceId: Id<Source>): OK {
        this.spawner.addTask(
            GetName.remoteHarvester(remoteRoomName, remoteSourceId),
            CreepRole.RemoteHarvester,
            {
                roomName: remoteRoomName,
                sourceId: remoteSourceId
            }
        )

        this.remoteReserver(remoteRoomName)

        return OK
    }

    /**
     * 发布房间预定者
     *
     * @param targetRoomName 要预定的外矿房间名
     */
    public remoteReserver (targetRoomName: string): void {
        this.spawner.addTask(
            GetName.reserver(targetRoomName),
            CreepRole.Reserver,
            { targetRoomName }
        )
    }

    /**
     * 给本房间签名
     *
     * @param content 要签名的内容
     * @param targetRoomName 要签名到的房间名（默认为本房间）
     */
    public sign (content: string, targetRoomName: string = undefined): string {
        const { room } = this.spawner
        const creepName = GetName.signer(room.name)
        const creep = Game.creeps[creepName]

        // 如果有活着的签名单位就直接签名
        if (assertSigner(creep)) {
            creep.memory.data.signText = content
            return `已将 ${creepName} 的签名内容修改为：${content}`
        }

        // 否则就发布一个
        this.spawner.addTask(creepName, CreepRole.Signer, {
            targetRoomName: targetRoomName || room.name,
            signText: content
        })

        return `已发布 ${creepName}, 签名内容为：${content}`
    }

    /**
     * 发布支援角色组
     *
     * @param remoteRoomName 要支援的房间名
     */
    public remoteHelper (remoteRoomName: string): void {
        const room = Game.rooms[remoteRoomName]
        if (!room) {
            log('目标房间没有视野，无法发布支援单位', this.spawner.room.name + ' CreepRelease', Color.Yellow)
            return
        }

        // 发布 upgrader 和 builder
        this.spawner.addTask(
            GetName.remoteUpgrader(remoteRoomName),
            CreepRole.RemoteUpgrader,
            {
                targetRoomName: remoteRoomName,
                sourceId: room.source[0].id
            }
        )

        this.spawner.addTask(
            GetName.remoteBuilder(remoteRoomName),
            CreepRole.RemoteBuilder,
            {
                targetRoomName: remoteRoomName,
                sourceId: room.source.length >= 2 ? room.source[1].id : room.source[0].id
            }
        )
    }

    /**
     * 发布 pbCarrier 小组
     * 由 pbAttacker 调用
     *
     * @param sourceFlagName powerBank 上的旗帜名
     * @param number 孵化几个 carrier
     */
    public pbCarrierGroup (sourceFlagName: string, number: number): void {
        // 如果已经有人发布过了就不再费事了
        if (GetName.pbCarrier(sourceFlagName, 0) in Game.creeps) return

        for (let i = 0; i < number; i++) {
            this.spawner.addTask(
                GetName.pbCarrier(sourceFlagName, i),
                CreepRole.PbCarrier,
                { sourceFlagName }
            )
        }
    }

    /**
     * 孵化 pb 采集小组（一红一绿为一组）
     *
     * @param targetFlagName 要采集的旗帜名
     * @param groupNumber 【可选】发布的采集小组数量
     */
    public pbHarvesteGroup (targetFlagName: string, groupNumber = 2): void {
        // 发布 attacker 和 healer，搬运者由 attacker 在后续任务中自行发布
        for (let i = 0; i < groupNumber; i++) {
            const attackerName = GetName.pbAttacker(targetFlagName, i)
            const healerName = GetName.pbHealer(targetFlagName, i)

            // 添加采集小组
            this.spawner.addTask(attackerName, CreepRole.PbAttacker, {
                sourceFlagName: targetFlagName,
                healerCreepName: healerName
            })
            this.spawner.addTask(healerName, CreepRole.PbHealer, {
                creepName: attackerName
            })
        }
    }

    /**
     * 孵化 deposit 采集单位
     *
     * @param sourceFlagName 要采集的旗帜名
     */
    public depositHarvester (sourceFlagName: string): void {
        // 发布采集者，他会自行完成剩下的工作
        this.spawner.addTask(
            GetName.depositHarvester(sourceFlagName),
            CreepRole.DepositHarvester,
            { sourceFlagName }
        )
    }

    /**
     * 孵化掠夺者
     *
     * @param sourceFlagName 要搜刮的建筑上插好的旗帜名
     * @param targetStructureId 要把资源存放到的建筑 id
     */
    public reiver (sourceFlagName = '', targetStructureId: Id<StructureWithStore> = undefined): string {
        const { room } = this.spawner
        if (!targetStructureId && !room.terminal) return `[${room.name}] 发布失败，请填写要存放到的建筑 id`

        const reiverName = GetName.reiver(room.name)

        this.spawner.addTask(reiverName, CreepRole.Reiver, {
            flagName: sourceFlagName || DEFAULT_FLAG_NAME.REIVER,
            targetId: targetStructureId || room.terminal.id
        })

        return `[${room.name}] 掠夺者 ${reiverName} 已发布, 目标旗帜名称 ${sourceFlagName || DEFAULT_FLAG_NAME.REIVER}, 将搬运至 ${targetStructureId || room.name + ' Terminal'}`
    }
}

/***
 * 断言一个 creep 是否为签名单位
 */
const assertSigner = function (creep: Creep): creep is RoleCreep<CreepRole.Signer> {
    return creep.memory.role === CreepRole.Signer
}
