/**
 * Room 原型拓展
 *
 * 包含了所有自定义的 room 拓展方法
 * 这些方法主要是用于和其他模块代码进行交互
 */
import { manageStructure, clearStructure, setBaseCenter, confirmBasePos, findBaseCenterPos } from '@/modulesGlobal/autoPlanning'
import { removeCreep } from '@/modulesGlobal/creep'
import { Color, createRoomLink, log } from '@/modulesGlobal'

export default class RoomExtension extends Room {
    /**
     * 房间打印日志
     * 会包含房间的信息
     *
     * @param content 日志内容
     * @param instanceName 实例名称
     * @param color 日志前缀颜色
     * @param notify 是否发送邮件
     */
    log (content: string, instanceName = '', color: Color | undefined = undefined, notify = false): void {
        // 为房间名添加超链接
        const roomName = createRoomLink(this.name)
        // 生成前缀并打印日志
        const prefix = instanceName ? roomName + ' ' + instanceName : roomName
        log(content, prefix, color, notify)
    }

    /**
     * 危险操作：执行本 api 将会直接将本房间彻底移除
     */
    public dangerousRemove (): string {
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
    public findBaseCenterPos (): RoomPosition[] {
        const targetPos = findBaseCenterPos(this.name)
        this.memory.centerCandidates = targetPos.map(pos => [pos.x, pos.y])

        return targetPos
    }

    /**
     * 确定基地选址
     * 从给定的位置中挑选一个最优的作为基地中心点，如果没有提供的话就从 memory.centerCandidates 中挑选
     * 挑选完成后会自动将其设置为中心点
     *
     * @param targetPos 待选的中心点数组
     */
    public confirmBaseCenter (targetPos: RoomPosition[] = undefined): RoomPosition | ERR_NOT_FOUND {
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
    public setBaseCenter (pos: RoomPosition): OK | ERR_INVALID_ARGS {
        return setBaseCenter(this, pos)
    }

    /**
     * 执行自动建筑规划
     */
    public planLayout (): string {
        if (this.memory.noLayout) return '房间指定了 noLayout，不运行自动规划'
        if (!this.memory.center) return '房间未指定中央点位'

        // 一级的时候移除所有非重要建筑
        if (this.controller.level === 1) clearStructure(this)

        const centerPos = new RoomPosition(...this.memory.center, this.name)
        const result = manageStructure(this, centerPos)

        if (result === OK) return '自动规划完成'
        else if (result === ERR_NOT_OWNER) return '自动规划失败，房间没有控制权限'
        else return `未找到基地中心点位，请执行 Game.rooms.${this.name}.setcenter() 以启用自动规划`
    }
}
