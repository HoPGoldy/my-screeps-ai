import { getFreeSpace } from '@/utils'
import { SourceContext } from './types'

/**
 * source 拓展
 *
 * 由于 source 经常和 container 以及 link 成对出现
 * 所以这里提供一些快捷方式方便将其对应的 container 或 link 绑定在一起，方便后续使用
 * 除此之外还可以绑定一个位置，用来标识房间开局时会把能量丢在哪里
 */
export const createSourceUtils = function (context: SourceContext) {
    const { getMemory } = context

    /**
     * 该 source 是否可以采集
     * 会检查自己还有没有能量，且周围有没有剩余开采位
     */
    const canUse = function (source: Source): boolean {
        if (source.energy <= 0) return false

        const freeCount = getFreeSpace(source.pos).length
        const harvestCount = source.pos.findInRange(FIND_CREEPS, 1).length

        return freeCount - harvestCount > 0
    }

    /**
     * 设置能量丢弃位置
     *
     * @param pos 能量会被丢弃到的位置上
     */
    const setDroppedPos = function (source: Source, pos: RoomPosition): void {
        const memory = getMemory(source)
        memory.dropped = `${pos.x},${pos.y}`
    }

    /**
     * 获取该 source 丢弃位置及其上的能量
     */
    const getDroppedInfo = function (source: Source): { pos?: RoomPosition, energy?: Resource<RESOURCE_ENERGY> } {
        const memory = getMemory(source)
        if (!memory.dropped) return {}

        // 获取能量丢弃位置
        const [x, y] = memory.dropped.split(',')
        const droppedPos = new RoomPosition(Number(x), Number(y), source.room.name)
        if (!droppedPos) {
            delete memory.dropped
            return {}
        }

        // 获取该位置上的能量（LOOK_ENERGY 和 LOOK_RESOURCES 获取到的结果是一样的，这是个坑）
        const energy = droppedPos.lookFor(LOOK_RESOURCES).find(res => {
            return res.resourceType === RESOURCE_ENERGY
        }) as Resource<RESOURCE_ENERGY>

        return { pos: droppedPos, energy }
    }

    /**
     * 绑定 container 到该 source
     */
    const setContainer = function (source: Source, container: StructureContainer): void {
        const memory = getMemory(source)
        memory.containerId = container.id
    }

    /**
     * 获取该 source 上绑定的 container
     * 注意，由于 container 没有视野，所以外矿 container 存在但房间没视野时可能也会返回 undefined
     */
    const getContainer = function (source: Source): StructureContainer | undefined {
        const memory = getMemory(source)
        if (!memory.containerId) return undefined

        const container = Game.getObjectById(memory.containerId)
        if (!container) {
            delete memory.containerId
            return undefined
        }

        return container
    }

    /**
     * 绑定 link 到该 source
     */
    const setLink = function (source: Source, link: StructureLink): void {
        const memory = getMemory(source)
        memory.linkId = link.id
    }

    /**
     * 获取该 source 上绑定的 link
     */
    const getLink = function (source: Source): StructureLink | undefined {
        const memory = getMemory(source)
        if (!memory.linkId) return undefined

        const link = Game.getObjectById(memory.linkId)
        if (!link) {
            delete memory.linkId
            return undefined
        }

        return link
    }

    return { canUse, setDroppedPos, getDroppedInfo, setContainer, getContainer, setLink, getLink }
}

export type SourceUtils = ReturnType<typeof createSourceUtils>
