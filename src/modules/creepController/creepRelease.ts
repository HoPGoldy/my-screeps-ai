import { DEFAULT_FLAG_NAME } from 'setting'
import { log } from 'utils'
import creepApi from './creepApi'

/**
 * 基于 creepApi 的封装
 * 可以注入到 Room 原型中，提供快速发布对应 creep（单个或多个）的功能
 */
class CreepRelease implements InterfaceCreepRelease {
    readonly roomName: string = ''

    constructor(roomName: string) {
        this.roomName = roomName
    }

    /**
     * 发布采集单位
     * 固定一个 source 发布一个单位
     */
    public harvester(): OK | ERR_NOT_FOUND {
        const room = Game.rooms[this.roomName]
        if (!room) return ERR_NOT_FOUND

        room.source.map((source, index) => {
            creepApi.add(`${room.name} harvester${index}`, 'harvester', {
                useRoom: room.name,
                harvestRoom: room.name,
                sourceId: source.id
            }, room.name)
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
    public changeBaseUnit(type: 'worker' | 'manager', adjust: number, bodyType?: SepicalBodyType): OK | ERR_NOT_FOUND | ERR_INVALID_TARGET {
        const room = Game.rooms[this.roomName]
        if (!room) return ERR_NOT_FOUND

        // 获取当前对应角色的单位数量
        let unitNumber = 0
        if (type === 'worker') {
            // 最少每个 source 一个工人
            unitNumber = updateBaseUnitNumber(room.memory, 'workerNumber', adjust, room.source.length)
        }
        else if (type === 'manager') {
            // 最少一个搬运工
            unitNumber = updateBaseUnitNumber(room.memory, 'transporterNumber', adjust, 1)
        }
        else {
            log(`未知的角色类型 ${type}`, [ 'creepRelease' ], 'red')
            return ERR_INVALID_TARGET
        }

        if (adjust >= 0) {
            // 添加新的单位
            for (let i = 0; i < adjust; i++) {
                if (creepApi.has(`${room.name} ${type}${i}`)) continue
                creepApi.add(`${room.name} ${type}${i}`, type, { workRoom: room.name, bodyType }, room.name)
            }
        }
        else {
            // 从末尾开始减少单位
            for (let i = unitNumber - 1; i >= 0; i--) {
                creepApi.remove(`${room.name} ${type}${i}`)
            }
        }

        log(`调整 ${type} 单位数量 [修正] ${adjust} [修正后数量] ${unitNumber}`)
        return OK
    }

    /**
     * 发布中央运输单位
     * @param room 要发布角色的房间（memory 需要包含 center 字段）
     */
    public processor(): OK | ERR_NOT_FOUND {
        const room = Game.rooms[this.roomName]
        if (!room || !room.memory.center) return ERR_NOT_FOUND

        const [ x, y ] = room.memory.center 
        creepApi.add(`${room.name} processor`, 'processor', { x, y }, room.name)

        return OK
    }

    /**
     * 发布外矿角色组
     * 
     * @param remoteRoomName 要发布 creep 的外矿房间
     */
    public remoteCreepGroup(remoteRoomName: string): OK | ERR_NOT_FOUND {
        const room = Game.rooms[this.roomName]
        if (!room) return ERR_NOT_FOUND

        const sourceFlagsName = [ `${remoteRoomName} source0`, `${remoteRoomName} source1` ]

        // 添加对应数量的外矿采集者
        sourceFlagsName.forEach((flagName, index) => {
            if (!(flagName in Game.flags)) return

            creepApi.add(`${remoteRoomName} remoteHarvester${index}`, 'remoteHarvester', {
                sourceFlagName: flagName,
                spawnRoom: room.name,
                targetId: room.memory.remote[remoteRoomName].targetId
            }, room.name)
        })

        this.remoteReserver(remoteRoomName)
    }

    /**
     * 发布房间预定者
     * 
     * @param remoteRoomName 要预定的外矿房间名
     * @param single 为 false 时将允许为一个房间发布多个预定者，为 true 时可以执行自动发布
     */
    public remoteReserver(remoteRoomName: string, single: boolean = true): void {
        // 添加外矿预定者
        const reserverName = `${remoteRoomName} reserver${single ? '' : Game.time}`
        if (!creepApi.has(reserverName)) creepApi.add(reserverName, 'reserver', {
            targetRoomName: remoteRoomName
        }, this.roomName)
    }

    /**
     * 给本房间签名
     * 
     * @param content 要签名的内容
     * @param targetRoomName 要签名到的房间名（默认为本房间）
     */
    public sign(content: string, targetRoomName: string = undefined): string {
        const creepName = `${this.roomName} signer`
        const creep = Game.creeps[creepName]
        // 如果有显存的签名单位就直接签名
        if (creep) {
            (creep.memory.data as RemoteDeclarerData).signText = content
            return `已将 ${creepName} 的签名内容修改为：${content}`
        }
        // 否则就发布一个
        creepApi.add(creepName, 'signer', {
            targetRoomName: targetRoomName || this.roomName,
            signText: content
        }, this.roomName)

        return `已发布 ${creepName}, 签名内容为：${content}`
    }

    /**
     * 发布支援角色组
     * 
     * @param remoteRoomName 要支援的房间名
     */
    public remoteHelper(remoteRoomName: string): void {
        const room = Game.rooms[remoteRoomName]

        if (!room) {
            log(`目标房间没有视野，无法发布支援单位`, [ this.roomName, 'CreepRelease' ], 'yellow')
            return
        }

        // 发布 upgrader 和 builder
        creepApi.add(`${remoteRoomName} RemoteUpgrader`, 'remoteUpgrader', {
            targetRoomName: remoteRoomName,
            sourceId: room.source[0].id
        }, this.roomName)
        creepApi.add(`${remoteRoomName} RemoteBuilder`, 'remoteBuilder', {
            targetRoomName: remoteRoomName,
            sourceId: room.source.length >= 2 ? room.source[1].id : room.source[0].id
        }, this.roomName)
    }

    /**
     * 发布 pbCarrier 小组
     * 由 pbAttacker 调用
     * 
     * @param flagName powerBank 上的旗帜名
     * @param number 孵化几个 carrier
     */
    public pbCarrierGroup(flagName: string, number: number): void {
        // 如果已经有人发布过了就不再费事了
        if (creepApi.has(`${flagName} carrier0`)) return
        
        for (let i = 0; i < number; i++) {
            creepApi.add(`${flagName} carrier${i}`, 'pbCarrier', {
                sourceFlagName: flagName,
                spawnRoom: this.roomName
            }, this.roomName)
        }
    }

    /**
     * 孵化 pb 采集小组（一红一绿为一组）
     * 
     * @param targetFlagName 要采集的旗帜名
     * @param groupNumber 【可选】发布的采集小组数量
     */
    public pbHarvesteGroup(targetFlagName: string, groupNumber: number = 2): void {
        // 发布 attacker 和 healer，搬运者由 attacker 在后续任务中自行发布
        for (let i = 0; i < groupNumber; i++) {
            const attackerName = `${targetFlagName} attacker${i}`
            const healerName = `${targetFlagName} healer${i}`

            // 添加采集小组
            creepApi.add(attackerName, 'pbAttacker', {
                sourceFlagName: targetFlagName,
                spawnRoom: this.roomName,
                healerCreepName: healerName
            }, this.roomName)
            creepApi.add(healerName, 'pbHealer', {
                creepName: `${targetFlagName} attacker${i}`
            }, this.roomName)
        }
    }

    /**
     * 孵化 deposit 采集单位
     * 
     * @param targetFlagName 要采集的旗帜名
     */
    public depositHarvester(targetFlagName: string): void {
        // 发布采集者，他会自行完成剩下的工作
        creepApi.add(`${targetFlagName} worker`, 'depositHarvester', {
            sourceFlagName: targetFlagName,
            spawnRoom: this.roomName
        }, this.roomName)
    }

    

    /**
     * 移除 pb 采集小组配置项
     * 
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
    public rangedAttacker(bearTowerNum: 0 | 1 | 3 | 5 | 2 | 4 | 6 = 6, targetFlagName: string = DEFAULT_FLAG_NAME.ATTACK, keepSpawn: boolean = false): string {
        const room = Game.rooms[this.roomName]
        if (!room) return `错误，无法访问的房间 ${this.roomName}`

        if (!room.memory.boost) return `发布失败，未启动 Boost 进程，执行 ${room.name}.war() 来启动战争状态`
        if (room.memory.boost.state !== 'waitBoost') return `无法发布，Boost 材料未准备就绪`

        const creepName = `${room.name} apocalypse ${Game.time}`
        creepApi.add(creepName, 'apocalypse', {
            targetFlagName: targetFlagName || DEFAULT_FLAG_NAME.ATTACK,
            bearTowerNum,
            keepSpawn
        }, room.name)

        return `已发布进攻一体机 [${creepName}] [扛塔等级] ${bearTowerNum} [进攻旗帜名称] ${targetFlagName} ${keepSpawn ? '' : '不'}持续生成，GoodLuck Commander`
    }

    /**
     * 孵化 boost 拆墙小组
     * 
     * @param targetFlagName 进攻旗帜名称
     * @param keepSpawn 是否持续生成
     */
    public dismantleGroup(targetFlagName: string = '', keepSpawn: boolean = false): string {
        const room = Game.rooms[this.roomName]
        if (!room) return `错误，无法访问的房间 ${this.roomName}`

        if (!room.memory.boost) return `发布失败，未启动 Boost 进程，执行 ${room.name}.war() 来启动战争状态`
        if (room.memory.boost.state !== 'waitBoost') return `无法发布，Boost 材料未准备就绪`

        const dismantlerName = `${room.name} dismantler ${Game.time}`
        const healerName = `${room.name} doctor ${Game.time}`
        creepApi.add(dismantlerName, 'boostDismantler', {
            targetFlagName: targetFlagName || DEFAULT_FLAG_NAME.ATTACK,
            healerName,
            keepSpawn
        }, room.name)
        creepApi.add(healerName, 'boostDoctor', {
            creepName: dismantlerName,
            keepSpawn
        }, room.name)

        return `已发布拆墙小组，正在孵化，GoodLuck Commander`
    }

    /**
     * 孵化基础进攻单位
     * 
     * @param targetFlagName 进攻旗帜名称
     * @param num 要孵化的数量
     */
    public soldier(targetFlagName: string = '', num: number = 1): string {
        if (num <=0 || num > 10) num = 1

        for (let i = 0; i < num; i++) {
            creepApi.add(`${this.roomName} soldier ${Game.time}-${i}`, 'soldier', {
                targetFlagName: targetFlagName || DEFAULT_FLAG_NAME.ATTACK,
                keepSpawn: false
            }, this.roomName)
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
    public dismantler(targetFlagName: string = '', num: number = 2, keepSpawn: boolean = false): string {
        if (num <=0 || num > 10) num = 1

        for (let i = 0; i < num; i++) {
            creepApi.add(`${this.roomName} dismantler ${Game.time}-${i}`, 'dismantler', {
                targetFlagName: targetFlagName || DEFAULT_FLAG_NAME.ATTACK,
                keepSpawn
            }, this.roomName)
        }

        return `已发布 dismantler*${num}，正在孵化`
    }

    /**
     * 孵化掠夺者
     * 
     * @param sourceFlagName 要搜刮的建筑上插好的旗帜名
     * @param targetStructureId 要把资源存放到的建筑 id
     */
    public reiver(sourceFlagName: string = '', targetStructureId: Id<StructureWithStore> = undefined): string {
        const room = Game.rooms[this.roomName]
        if (!room) return `错误，无法访问的房间 ${this.roomName}`

        if (!targetStructureId && !room.terminal) return `[${room.name}] 发布失败，请填写要存放到的建筑 id`
        const reiverName = `${room.name} reiver ${Game.time}`
        creepApi.add(reiverName, 'reiver', {
            flagName: sourceFlagName || DEFAULT_FLAG_NAME.REIVER,
            targetId: targetStructureId || room.terminal.id
        }, room.name)

        return `[${room.name}] 掠夺者 ${reiverName} 已发布, 目标旗帜名称 ${sourceFlagName || DEFAULT_FLAG_NAME.REIVER}, 将搬运至 ${targetStructureId ? targetStructureId : room.name + ' Terminal'}`
    }
}

/**
 * 所有的房间物流对象都被存放到这里
 */
const releaseControllers: { [roomName: string]: CreepRelease } = {}

/**
 * 向房间原型挂载物流对象
 * 
 * @param key 要挂载到 Room 的哪个键上
 */
export default function (key: string = 'release') {
    Object.defineProperty(Room.prototype, key, {
        get() {
            if (!(this.name in releaseControllers)) {
                releaseControllers[this.name] = new CreepRelease(this.name)
            }

            return releaseControllers[this.name]
        },
        enumerable: false,
        configurable: true
    })
}

/**
 * 更新基地运营单位数量
 * 会把新值保存到对应的房间内存上并返回
 * 
 * @param memory 对应保存的房间内存
 * @param key 数据保存在房间内存的哪个键上
 * @param adjust 调整值，增加或减少多少
 * @param min 最小值，如果要更新的值小于这个值的话会被丢弃
 * @returns 更新后的新值
 */
const updateBaseUnitNumber = function (memory: RoomMemory, key: 'workerNumber' | 'transporterNumber', adjust: number, min: number): number {
    const oldNumber = memory[key]

    // 数量不足了就设置为最小值
    if (oldNumber == undefined || oldNumber + adjust <= 0) memory[key] = min
    // 数量足够就调整
    else memory[key] += adjust

    return memory[key]
}