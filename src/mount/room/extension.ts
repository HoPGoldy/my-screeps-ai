/**
 * Room 原型拓展
 * 
 * 包含了所有自定义的 room 拓展方法
 * 这些方法主要是用于和其他模块代码进行交互
 */

import { BOOST_RESOURCE } from '@/setting'
import { setBaseCenter, confirmBasePos, findBaseCenterPos } from '@/modulesGlobal/autoPlanning/planBasePos'
import { manageStructure } from '@/modulesGlobal/autoPlanning'
import { removeCreep } from '@/modulesGlobal/creep'
import { TransportTaskType } from '@/modulesRoom'
import { Color, createRoomLink, log } from '@/modulesGlobal'

export default class RoomExtension extends Room {
    /**
     * 全局日志
     * 
     * @param content 日志内容
     * @param prefixes 前缀中包含的内容
     * @param color 日志前缀颜色
     * @param notify 是否发送邮件
     */
    log(content:string, instanceName: string = '', color: Color | undefined = undefined, notify: boolean = false): void {
        // 为房间名添加超链接
        const roomName = createRoomLink(this.name)
        // 生成前缀并打印日志
        const prefixes = instanceName ? [ roomName, instanceName ] : [ roomName ]
        log(content, prefixes, color, notify)
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

        // 移除 creep
        removeCreep(this.name, { batch: true, immediate: true })

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
            this.transport.addTask({ type: TransportTaskType.BoostGetResource })
            this.transport.addTask({ type: TransportTaskType.BoostGetEnergy })
        
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
}