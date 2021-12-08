import { createCache } from '@/utils'
import { LinkMemory } from '.'
import { LinkContext } from './types'

/**
 * 中央 link 中能量大于该值时才会发送给 upgrade link
 */
const UPGRADE_ENERGY_SEND_LIMIT = 600

export const createLinkController = function (context: LinkContext) {
    const { getMemory, getLink, env, transferEnergy, hasTransferTask, getEnergyStructure, getSourceLink, onLinkBindToSource } = context

    const lazyLoader = function (roomName: string) {
        /**
         * 注册为源 link
         * 注册后对应 source 的采集单位不会立刻反应过来，要等到新的采集单位孵化后才会查找到 link
         */
        const asSource = function (link: StructureLink): string {
            clearRegister(link)

            // 找到身边第一个没有设置 link 的 source，并把自己绑定上去
            const nearSource = link.pos.findInRange(FIND_SOURCES, 2, {
                filter: source => !getSourceLink(source)
            })
            if (nearSource[0]) {
                onLinkBindToSource && onLinkBindToSource(link, nearSource[0])
            }

            return `${this} 已注册为源 link`
        }

        /**
         * 注册为中央 link
         */
        const asCenter = function (link: StructureLink): string {
            clearRegister(link)
            const memory = getMemory(link.room)
            memory.centerLinkId = link.id
            return `${this} 已注册为中央 link，发布 processor 并调整采集单位`
        }

        /**
         * 注册为升级 link
         *
         * 自己被动的给 upgrader 角色提供能量，所以啥也不做
         * 只是在房间内存里注册来方便其他 link 找到自己
         */
        const asUpgrade = function (link: StructureLink): string {
            clearRegister(link)
            const memory = getMemory(link.room)
            memory.upgradeLinkId = link.id
            return `${this} 已注册为升级 link`
        }

        /**
         * 每次使用三个 as 时都要调用
         * 防止同时拥有多个角色
         */
        const clearRegister = function (link: StructureLink) {
            const memory = getMemory(link.room)
            if (memory.centerLinkId === link.id) delete memory.centerLinkId
            if (memory.upgradeLinkId === link.id) delete memory.upgradeLinkId
        }

        /**
         * 通过 memory 中指定字段名中的值获取 link
         * 如果没有找到对应的 link id 的话则清除该字段
         */
        const getLinkByMemoryKey = function (memoryKey: keyof LinkMemory, room: Room): StructureLink | null {
            const memory = getMemory(room)
            if (!memory[memoryKey]) return null
            const link = env.getObjectById(memory[memoryKey])
            // 不存在说明 link 已经被摧毁了 清理并退出
            if (!link) {
                delete memory[memoryKey]
                return null
            }
            else return link
        }

        /**
         * 把能量发送给升级 Link
         * @returns 是否进行了发送
         */
        const supportUpgradeLink = function (sourceLink: StructureLink, room: Room): boolean {
            const upgradeLink = getLinkByMemoryKey('upgradeLinkId', room)
            if (!upgradeLink) return false

            // 如果 upgrade link 没能量了就转发给它
            if (upgradeLink && upgradeLink.store[RESOURCE_ENERGY] <= 100) {
                sourceLink.transferEnergy(upgradeLink)
                return true
            }

            return false
        }

        /**
         * 扮演中央 link
         *
         * 能量快满时向房间中的资源转移队列推送任务
         */
        const runCenterWork = function (link: StructureLink, room: Room) {
            // 能量不足则待机
            if (link.store[RESOURCE_ENERGY] < UPGRADE_ENERGY_SEND_LIMIT) return

            // 优先响应 upgrade
            if (supportUpgradeLink(link, room)) return

            if (!room.storage) return
            // 之前发的转移任务没有处理好的话就先挂机
            if (!hasTransferTask(room)) transferEnergy(link, room.storage, link.store[RESOURCE_ENERGY])
        }

        /**
         * 扮演升级 link
         *
         * 自己能量不足时检查 storage 和 terminal 里的能量，并发布中央物流
         */
        const runUpgradeWork = function (link: StructureLink, room: Room) {
            // 有能量就待机
            if (link.store[RESOURCE_ENERGY] > 100) return
            const centerlink = getLinkByMemoryKey('centerLinkId', room)
            // 中央 link 没冷却好，待机
            if (!centerlink || centerlink.cooldown > 0) return
            // 中央 link 里已经有了足够的能量，等着就行，一会就发过来了
            if (centerlink.store[RESOURCE_ENERGY] >= UPGRADE_ENERGY_SEND_LIMIT) return

            /**
             * 当 RCL 小于 7 时，房间只支持 3 个 link，这时存在 upgradeLink 的话就导致房间内存在 4 个 Link（1 个 center、2 个 source）
             * 这就导致了这四个 link 中势必会有一个 link 不能工作，如果这个 link 恰好是 centerLink 的话，整个房间运营就会卡死。
             * 所以，在不够 7 级时应该主动移除 upgradeLink。
             *
             * 这种情况只会在房间从 7 级以上掉级下来时出现
             */
            if (room.controller.level < 7) link.destroy()

            const sourceStructure = getEnergyStructure(room)
            // 找不到目标，或者还有 link 能量搬运任务了，放弃治疗
            if (!sourceStructure || hasTransferTask(room)) return

            // 自己和 centerLink 的容量中找最小值
            const amount = Math.min(
                link.store.getFreeCapacity(RESOURCE_ENERGY),
                centerlink.store.getFreeCapacity(RESOURCE_ENERGY)
            )

            // 给 centerLink 填能量
            transferEnergy(sourceStructure, centerlink, amount)
        }

        /**
         * 扮演能量提供 link
         *
         * 如果房间内有 upgrede link 并且其没有能量时则把自己的能量转移给它
         * 否则向中央 link 发送能量
         * 都不存在时待机
         */
        const runSourceWork = function (link: StructureLink, room: Room) {
            // 能量填满再发送
            if (link.store.getUsedCapacity(RESOURCE_ENERGY) < 700) return

            // 优先响应 upgrade，在 8 级后这个检查用处不大，暂时注释了
            // if (supportUpgradeLink(link, room)) return

            // 发送给 center link
            const centerLink = getLinkByMemoryKey('centerLinkId', room)
            if (!centerLink || centerLink.store[RESOURCE_ENERGY] >= 799) return

            link.transferEnergy(centerLink)
        }

        const runSingleLink = function (room: Room, link: StructureLink) {
            const { centerLinkId, upgradeLinkId } = getMemory(room)

            if (link.id === centerLinkId) runCenterWork(link, room)
            else if (link.id === upgradeLinkId) runUpgradeWork(link, room)
            else runSourceWork(link, room)
        }

        const run = function () {
            const room = env.getRoomByName(roomName)
            getLink(room).forEach(link => runSingleLink(room, link))
        }

        return { run, asSource, asCenter, asUpgrade }
    }

    const [getLinkController] = createCache(lazyLoader)
    return getLinkController
}

export type LinkController = ReturnType<ReturnType<typeof createLinkController>>
