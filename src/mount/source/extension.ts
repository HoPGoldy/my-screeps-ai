/**
 * source 拓展
 * 
 * 由于 source 经常和 container 以及 link 成对出现
 * 所以这里提供一个快捷方式方便将其对应的 container 或 link 绑定在一起，方便后续使用
 * 除此之外还会绑定一个位置，用来标识房间开局时会把能量丢在哪里
 */
export default class SourceExtension extends Source {
    /**
     * 该 source 是否可以采集
     * 会检查自己还有没有能量，且周围有没有剩余开采位
     */
    public canUse(): boolean {
        if (this.energy <= 0) return false

        const freeCount = this.pos.getFreeSpace().length
        const harvestCount = this.pos.findInRange(FIND_CREEPS, 1).length

        return freeCount - harvestCount > 0
    }
    /**
     * 设置能量丢弃位置
     * 
     * @param pos 能量会被丢弃到的位置上
     */
    public setDroppedPos(pos: RoomPosition): void {
        this.keepKeyExist()
        this.room.memory.source[this.id].dropped = `${pos.x},${pos.y}`
    }

    /**
     * 获取该 source 丢弃位置及其上的能量
     */
    public getDroppedInfo(): { pos?: RoomPosition, energy?: Resource<RESOURCE_ENERGY> } {
        this.keepKeyExist()

        const { dropped } = this.room.memory.source[this.id]
        if (!dropped) return {}
        
        // 获取能量丢弃位置
        const [ x, y ] = dropped.split(',')
        const droppedPos = new RoomPosition(Number(x), Number(y), this.room.name)
        if (!droppedPos) {
            delete this.room.memory.source[this.id].dropped
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
    public setContainer(container: StructureContainer): void {
        this.keepKeyExist()
        this.room.memory.source[this.id].containerId = container.id
    }

    /**
     * 获取该 source 上绑定的 container
     * 注意，由于 container 没有视野，所以外矿 container 存在但房间没视野时可能也会返回 undefined
     */
    public getContainer(): StructureContainer | undefined {
        this.keepKeyExist()

        const { containerId } = this.room.memory.source[this.id]
        if (!containerId) return undefined

        const container = Game.getObjectById(containerId)
        if (!container) {
            delete this.room.memory.source[this.id].containerId
            return undefined
        }

        return container
    }

    /**
     * 绑定 link 到该 source
     */
    public setLink(link: StructureLink): void {
        this.keepKeyExist()
        this.room.memory.source[this.id].linkId = link.id
    }

    /**
     * 获取该 source 上绑定的 link
     */
    public getLink(): StructureLink | undefined {
        this.keepKeyExist()

        const { linkId } = this.room.memory.source[this.id]
        if (!linkId) return undefined

        const link = Game.getObjectById(linkId)
        if (!link) {
            delete this.room.memory.source[this.id].linkId
            return undefined
        }

        return link
    }

    /**
     * 保证所需的内存字段一定存在
     */
    private keepKeyExist(): void {
        if (!this.room.memory.source) this.room.memory.source = {}
        if (!this.room.memory.source[this.id]) this.room.memory.source[this.id] = {}
    }
}