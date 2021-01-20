/**
 * Room 原型拓展
 * 
 * 包含了所有自定义的 room 拓展方法
 * 这些方法主要是用于和其他模块代码进行交互
 */

import { creepApi } from 'modules/creepController'
import { BOOST_RESOURCE, ENERGY_SHARE_LIMIT } from 'setting'
import { setBaseCenter, confirmBasePos, findBaseCenterPos } from 'modules/autoPlanning/planBasePos'
import { manageStructure } from 'modules/autoPlanning'
import { createRoomLink, log } from 'utils'

export default class RoomExtension extends Room {
    /**
     * 全局日志
     * 
     * @param content 日志内容
     * @param prefixes 前缀中包含的内容
     * @param color 日志前缀颜色
     * @param notify 是否发送邮件
     */
    log(content:string, instanceName: string = '', color: Colors | undefined = undefined, notify: boolean = false): void {
        // 为房间名添加超链接
        const roomName = createRoomLink(this.name)
        // 生成前缀并打印日志
        const prefixes = instanceName ? [ roomName, instanceName ] : [ roomName ]
        log(content, prefixes, color, notify)
    }

    

    /**
     * 向房间中发布 power 请求任务
     * 该方法已集成了 isPowerEnabled 判定，调用该方法之前无需额外添加房间是否启用 power 的逻辑
     * 
     * @param task 要添加的 power 任务
     * @param priority 任务优先级位置，默认追加到队列末尾。例：该值为 0 时将无视队列长度直接将任务插入到第一个位置
     * @returns OK 添加成功
     * @returns ERR_NAME_EXISTS 已经有同名任务存在了
     * @returns ERR_INVALID_TARGET 房间控制器未启用 power
     */
    public addPowerTask(task: PowerConstant, priority: number = null): OK | ERR_NAME_EXISTS | ERR_INVALID_TARGET {
        // 初始化时添加房间初始化任务（编号 -1）
        if (!this.memory.powerTasks) this.memory.powerTasks = [ -1 as PowerConstant ]
        if (!this.controller.isPowerEnabled) return ERR_INVALID_TARGET

        // 有相同的就拒绝添加
        if (this.hasPowerTask(task)) return ERR_NAME_EXISTS

        // 发布任务到队列
        if (!priority) this.memory.powerTasks.push(task)
        // 追加到队列指定位置
        else this.memory.powerTasks.splice(priority, 0, task)
        
        return OK
    }

    /**
     * 检查是否已经存在指定任务
     * 
     * @param task 要检查的 power 任务
     */
    private hasPowerTask(task: PowerConstant): boolean {
        return this.memory.powerTasks.find(power => power === task) ? true : false
    }

    /**
     * 获取当前的 power 任务
     */
    public getPowerTask(): PowerConstant | undefined {
        if (!this.memory.powerTasks || this.memory.powerTasks.length <= 0) return undefined
        else return this.memory.powerTasks[0]
    }

    /**
     * 挂起当前任务
     * 将会把最前面的 power 任务移动到队列末尾
     */
    public hangPowerTask(): void {
        const task = this.memory.powerTasks.shift()
        this.memory.powerTasks.push(task)
    }

    /**
     * 移除第一个 power 任务
     */
    public deleteCurrentPowerTask(): void {
        this.memory.powerTasks.shift()
    }

    /**
     * 将指定位置序列化为字符串
     * 形如: 12/32/E1N2
     * 
     * @param pos 要进行压缩的位置
     */
    public serializePos(pos: RoomPosition): string {
        return `${pos.x}/${pos.y}/${pos.roomName}`
    }

    /**
     * 将位置序列化字符串转换为位置
     * 位置序列化字符串形如: 12/32/E1N2
     * 
     * @param posStr 要进行转换的字符串
     */
    public unserializePos(posStr: string): RoomPosition | undefined {
        // 形如 ["12", "32", "E1N2"]
        const infos = posStr.split('/')

        return infos.length === 3 ? new RoomPosition(Number(infos[0]), Number(infos[1]), infos[2]) : undefined
    }

    /**
     * 向生产队列里推送一个生产任务
     * 
     * @param taskName config.creep.ts 文件里 creepConfigs 中定义的任务名
     * @returns 当前任务在队列中的排名
     */
    public addSpawnTask(taskName: string): number | ERR_NAME_EXISTS {
        if (!this.memory.spawnList) this.memory.spawnList = []
        // 先检查下任务是不是已经在队列里了
        if (!this.hasSpawnTask(taskName)) {
            // 任务加入队列
            this.memory.spawnList.push(taskName)
            return this.memory.spawnList.length - 1
        }
        // 如果已经有的话返回异常
        else return ERR_NAME_EXISTS
    }

    /**
     * 检查生产队列中是否包含指定任务
     * 
     * @param taskName 要检查的任务名
     * @returns true/false 有/没有
     */
    public hasSpawnTask(taskName: string): boolean {
        if (!this.memory.spawnList) this.memory.spawnList = []
        return this.memory.spawnList.indexOf(taskName) > -1
    }

    /**
     * 清空任务队列
     * 非测试情况下不要调用！
     */
    public clearSpawnTask(): void {
        this.memory.spawnList = []
    }

    /**
     * 将当前任务挂起
     * 任务会被移动至队列末尾
     */
    public hangSpawnTask(): void {
        const task = this.memory.spawnList.shift()
        this.memory.spawnList.push(task)
    }

    /**
     * 危险操作：执行本 api 将会直接将本房间彻底移除
     */
    public dangerousRemove(): string {
        // 移除建筑
        this.find(FIND_STRUCTURES).forEach(s => {
            if (
                s.structureType === STRUCTURE_STORAGE ||
                s.structureType === STRUCTURE_TERMINAL ||
                s.structureType === STRUCTURE_WALL ||
                s.structureType === STRUCTURE_RAMPART
            ) return

            s.destroy()
        })

        // 移除 creep config
        creepApi.batchRemove(this.name)

        // 移除 creep
        for (const name in Game.creeps) {
            const creep = Game.creeps[name]
            if (creep.name.includes(this.name)) {
                creep.suicide()
                delete creep.memory
            }
        }

        // 移除内存
        delete this.memory
        delete Memory.stats.rooms[this.name]

        // 放弃房间
        this.controller.unclaim()

        return this.name + ' 房间已移除'
    }

    

    /**
     * 在本房间中查找可以放置基地的位置
     * 会将可选位置保存至房间内存
     * 
     * @returns 可以放置基地的中心点
     */
    public findBaseCenterPos(): RoomPosition[] {
        const targetPos = findBaseCenterPos(this.name)
        this.memory.centerCandidates = targetPos.map(pos => [ pos.x, pos.y ])

        return targetPos
    }
    
    /**
     * 确定基地选址
     * 从给定的位置中挑选一个最优的作为基地中心点，如果没有提供的话就从 memory.centerCandidates 中挑选
     * 挑选完成后会自动将其设置为中心点
     * 
     * @param targetPos 待选的中心点数组
     */
    public confirmBaseCenter(targetPos: RoomPosition[] = undefined): RoomPosition | ERR_NOT_FOUND {
        if (!targetPos) {
            if (!this.memory.centerCandidates) return ERR_NOT_FOUND
            targetPos = this.memory.centerCandidates.map(c => new RoomPosition(c[0], c[1], this.name))
        }
        
        const center = confirmBasePos(this, targetPos)
        setBaseCenter(this, center)
        delete this.memory.centerCandidates

        return center
    }

    /**
     * 设置基地中心
     * @param pos 中心点位
     */
    public setBaseCenter(pos: RoomPosition): OK | ERR_INVALID_ARGS {
        return setBaseCenter(this, pos)
    }

    /**
     * 执行自动建筑规划
     */
    public planLayout(): string {
        const result = manageStructure(this)

        if (result === OK) return `自动规划完成`
        else if (result === ERR_NOT_OWNER) return `自动规划失败，房间没有控制权限`
        else return `未找到基地中心点位，请执行 Game.rooms.${this.name}.setcenter() 以启用自动规划`
    }

    /**
     * 向其他房间请求资源共享
     * 
     * @param resourceType 请求的资源类型
     * @param amount 请求的数量
     */
    public shareRequest(resourceType: ResourceConstant, amount: number): boolean {
        const targetRoom = this.shareGetSource(resourceType, amount)
        if (!targetRoom) return false

        const addResult = targetRoom.shareAdd(this.name, resourceType, amount)
        return addResult
    }

    /**
     * 将本房间添加至资源来源表中
     * 
     * @param resourceType 添加到的资源类型
     */
    public shareAddSource(resourceType: ResourceConstant): boolean {
        if (!(resourceType in Memory.resourceSourceMap)) Memory.resourceSourceMap[resourceType] = []

        const alreadyRegister = Memory.resourceSourceMap[resourceType].find(name => name == this.name)
        // 如果已经被添加过了就返回 false
        if (alreadyRegister) return false

        Memory.resourceSourceMap[resourceType].push(this.name)
        return true
    }

    /**
     * 从资源来源表中移除本房间房间
     * 
     * @param resourceType 从哪种资源类型中移除
     */
    public shareRemoveSource(resourceType: ResourceConstant): void {
        // 没有该资源就直接停止
        if (!(resourceType in Memory.resourceSourceMap)) return 

        // 获取该房间在资源来源表中的索引
        _.pull(Memory.resourceSourceMap[resourceType], this.name)
        // 列表为空了就直接移除
        if (Memory.resourceSourceMap[resourceType].length <= 0) delete Memory.resourceSourceMap[resourceType]
    }

    /**
     * 向本房间添加资源共享任务
     * 
     * @param targetRoom 资源发送到的房间
     * @param resourceType 共享资源类型
     * @param amount 共享资源数量
     * @returns 是否成功添加
     */
    public shareAdd(targetRoom: string, resourceType: ResourceConstant, amount: number): boolean {
        if (this.memory.shareTask || !this.terminal) return false

        // 本房间内指定资源的存量
        const terminalAmount = this.terminal.store[resourceType] || 0
        const storageAmount = this.storage ? (this.storage.store[resourceType] || 0) : 0

        // 终端能发送的最大数量（路费以最大发送量计算）
        const freeSpace = this.terminal.store.getFreeCapacity() + terminalAmount - Game.market.calcTransactionCost(amount, this.name, targetRoom)
        // 期望发送量、当前存量、能发送的最大数量中找最小的
        const sendAmount = Math.min(amount, terminalAmount + storageAmount, freeSpace)

        this.memory.shareTask = {
            target: targetRoom,
            resourceType,
            amount: sendAmount
        }
        return true
    }

    /**
     * 根据资源类型查找来源房间
     * 
     * @param resourceType 要查找的资源类型
     * @param amount 请求的数量
     * @returns 找到的目标房间，没找到返回 null
     */
    private shareGetSource(resourceType: ResourceConstant, amount: number): Room | null {
        // 兜底
        if (!Memory.resourceSourceMap) {
            Memory.resourceSourceMap = {}
            return null
        }
        const SourceRoomsName = Memory.resourceSourceMap[resourceType]
        if (!SourceRoomsName) return null

        // 寻找合适的房间
        let targetRoom: Room = null
        // 变量房间名数组，注意，这里会把所有无法访问的房间筛选出来
        Memory.resourceSourceMap[resourceType] = SourceRoomsName.filter(roomName => {
            const room = Game.rooms[roomName]

            if (!room || !room.terminal) return false
            // 该房间有任务或者就是自己，不能作为共享来源
            if (room.memory.shareTask || room.name === this.name) return true

            // 如果请求共享的是能量
            if (resourceType === RESOURCE_ENERGY) {
                if (!room.storage) return false
                // 该房间 storage 中能量低于要求的话，就从资源提供列表中移除该房间
                if (room.storage.store[RESOURCE_ENERGY] < ENERGY_SHARE_LIMIT) return false
            }
            else {
                // 如果请求的资源已经没有的话就暂时跳过（因为无法确定之后是否永远无法提供该资源）
                if ((room.terminal.store[resourceType] || 0) <= 0) return true
            }

            // 接受任务的房间就是你了！
            targetRoom = room
            return true
        })

        // 把上面筛选出来的空字符串元素去除
        return targetRoom
    }

    /**
     * 切换为战争状态
     * 需要提前插好名为 [房间名 + Boost] 的旗帜，并保证其周围有足够数量的 lab
     * 
     * @param boostType 以什么形式启动战争状态
     * @returns ERR_NAME_EXISTS 已经处于战争状态
     * @returns ERR_NOT_FOUND 未找到强化旗帜
     * @returns ERR_INVALID_TARGET 强化旗帜附近的lab数量不足
     */
    public startWar(boostType: BoostType): OK | ERR_NAME_EXISTS | ERR_NOT_FOUND | ERR_INVALID_TARGET {
        if (this.memory.war) return ERR_NAME_EXISTS

        // 获取 boost 旗帜
        const boostFlagName = this.name + 'Boost'
        const boostFlag = Game.flags[boostFlagName]
        if (!boostFlag) return ERR_NOT_FOUND

        // 获取执行强化的 lab
        const labs = boostFlag.pos.findInRange<StructureLab>(FIND_STRUCTURES, 1, {
            filter: s => s.structureType == STRUCTURE_LAB
        })
        // 如果 lab 数量不够
        if (labs.length < BOOST_RESOURCE[boostType].length) return ERR_INVALID_TARGET

        // 初始化 boost 任务
        let boostTask: BoostTask = {
            state: 'boostGet',
            pos: [ boostFlag.pos.x, boostFlag.pos.y ],
            type: boostType,
            lab: {}
        }

        // 统计需要执行强化工作的 lab 并保存到内存
        BOOST_RESOURCE[boostType].forEach(res => boostTask.lab[res] = labs.pop().id)

        // 发布 boost 任务
        this.memory.boost = boostTask
        this.memory.war = {}
        return OK
    }

    /**
     * 强化指定 creep
     * 
     * @param creep 要进行强化的 creep，该 creep 应站在指定好的强化位置上
     * @returns ERR_NOT_FOUND 未找到boost任务
     * @returns ERR_BUSY boost尚未准备完成
     * @returns ERR_NOT_IN_RANGE creep不在强化位置上
     */
    public boostCreep(creep: Creep): OK | ERR_NOT_FOUND | ERR_BUSY | ERR_NOT_IN_RANGE {
        if (!this.memory.boost) return ERR_NOT_FOUND

        // 检查是否准备好了
        if (this.memory.boost.state != 'waitBoost') return ERR_BUSY

        // 获取全部 lab
        let executiveLab: StructureLab[] = []
        for (const resourceType in this.memory.boost.lab) {
            const lab = Game.getObjectById(this.memory.boost.lab[resourceType])
            // 这里没有直接终止进程是为了避免 lab 集群已经部分被摧毁而导致整个 boost 进程无法执行
            if (lab) executiveLab.push(lab)
        }

        // 执行强化
        const boostResults = executiveLab.map(lab => lab.boostCreep(creep))
        
        // 有一个强化成功了就算强化成功
        if (boostResults.includes(OK)) {
            // 强化成功了就发布资源填充任务是因为
            // 在方法返回 OK 时，还没有进行 boost（将在 tick 末进行），所以这里检查资源并不会发现有资源减少
            // 为了提高存储量，这里直接发布任务，交给 manager 在处理任务时检查是否有资源不足的情况
            this.transport.addTask({ type: 'boostGetResource' })
            this.transport.addTask({ type: 'boostGetEnergy' })
        
            return OK
        }
        else return ERR_NOT_IN_RANGE
    }

    /**
     * 解除战争状态
     * 会同步取消 boost 进程
     */
    public stopWar(): OK | ERR_NOT_FOUND {
        if (!this.memory.war) return ERR_NOT_FOUND

        // 将 boost 状态置为 clear，labExtension 会自动发布清理任务并移除 boostTask
        if (this.memory.boost) this.memory.boost.state = 'boostClear'
        delete this.memory.war

        return OK
    }

    /**
     * 拓展新的外矿
     * 
     * @param remoteRoomName 要拓展的外矿房间名
     * @param targetId 能量搬到哪个建筑里
     * @returns ERR_INVALID_TARGET targetId 找不到对应的建筑
     * @returns ERR_NOT_FOUND 没有找到足够的 source 旗帜
     */
    public addRemote(remoteRoomName: string, targetId: Id<StructureWithStore>): OK | ERR_INVALID_TARGET | ERR_NOT_FOUND {
        // target 建筑一定要有
        if (!Game.getObjectById(targetId)) return ERR_INVALID_TARGET
        // 目标 source 也至少要有一个
        const sourceFlagsName = [ `${remoteRoomName} source0`, `${remoteRoomName} source1` ]
        if (!(sourceFlagsName[0] in Game.flags)) return ERR_NOT_FOUND
        // 兜底
        if (!this.memory.remote) this.memory.remote = {}

        // 添加对应的键值对
        this.memory.remote[remoteRoomName] = { targetId }

        this.release.remoteCreepGroup(remoteRoomName)
        return OK
    }

    /**
     * 移除外矿
     * 
     * @param remoteRoomName 要移除的外矿
     * @param removeFlag 是否移除外矿的 source 旗帜
     */
    public removeRemote(remoteRoomName: string, removeFlag: boolean = false): OK | ERR_NOT_FOUND {
        // 兜底
        if (!this.memory.remote) return ERR_NOT_FOUND
        if (!(remoteRoomName in this.memory.remote)) return ERR_NOT_FOUND
        
        delete this.memory.remote[remoteRoomName]
        if (Object.keys(this.memory.remote).length <= 0) delete this.memory.remote

        const sourceFlagsName = [ `${remoteRoomName} source0`, `${remoteRoomName} source1` ]
        // 移除对应的旗帜和外矿采集单位
        sourceFlagsName.forEach((flagName, index) => {
            if (!(flagName in Game.flags)) return

            if (removeFlag) Game.flags[flagName].remove()
            creepApi.remove(`${remoteRoomName} remoteHarvester${index}`)
        })

        // 移除预定者
        creepApi.remove(`${remoteRoomName} reserver`)

        return OK
    }

    /**
     * 占领新房间
     * 本方法只会发布占领单位，等到占领成功后 claimer 会自己发布支援单位
     * 
     * @param targetRoomName 要占领的目标房间
     * @param signText 新房间的签名
     */
    public claimRoom(targetRoomName: string, signText: string = ''): OK {
        creepApi.add(`${targetRoomName} Claimer`, 'claimer', {
            targetRoomName,
            spawnRoom: this.name,
            signText
        }, this.name)

        return OK
    }
}