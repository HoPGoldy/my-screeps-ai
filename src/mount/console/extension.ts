/**
 * Room 原型拓展
 *
 * 包含了所有自定义的 room 拓展方法
 * 这些方法主要是用于和其他模块代码进行交互
 */
import { clearStructure } from '@/modulesGlobal/autoPlanning'
import { autoPlanner } from '../room/autoPlanner'
import { Color, createRoomLink, log } from '@/utils'

export class RoomExtension extends Room {
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

        // 移除内存
        delete this.memory
        delete Memory.stats.rooms[this.name]

        // 移除 creep
        this.find(FIND_MY_CREEPS).forEach(creep => creep.suicide())

        // 放弃房间
        this.controller.unclaim()

        return this.name + ' 房间已移除'
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
        const result = autoPlanner.runStaticPlan(this, centerPos)

        if (result === OK) return '自动规划完成'
        else if (result === ERR_NOT_OWNER) return '自动规划失败，房间没有控制权限'
    }
}

declare global {
    /**
     * 房间内存
     */
    interface RoomMemory {
        /**
         * 该房间发起移除操作的时间
         * 执行移除时会检查该时间，如果已经过期的话将不会执行移除操作
         */
        removeTime?: number
        /**
         * 基地中心点坐标, [0] 为 x 坐标, [1] 为 y 坐标
         */
        center: [number, number]
        /**
         * 是否关闭自动布局，该值为 true 时将不会对本房间运行自动布局
         */
        noLayout: boolean
    }

    /**
     * 房间拓展
     * 来自于 mount.structure.ts
     */
    interface Room {
        /**
         * 发送日志
         *
         * @param content 日志内容
         * @param instanceName 发送日志的实例名
         * @param color 日志前缀颜色
         * @param notify 是否发送邮件
         */
        log(content:string, instanceName?: string, color?: Color, notify?: boolean): void

        /**
         * 资源共享 api
         */
        giver(roomName: string, resourceType: ResourceConstant, amount?: number): string

        /**
         * 自动规划相关
         */
        planLayout(): string
    }
}
