/**
 * source 拓展
 * 
 * 由于 source 经常和 container 以及 link 成对出现
 * 所以这里提供一个快捷方式方便将其对应的 container 或 link 绑定在一起，方便后续使用
 */
export default class SourceExtension extends Source {
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
        const { containerId } = this.room.memory.source?.[this.id]
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
        this.room.memory.source[this.id].LinkId = link.id
    }

    /**
     * 获取该 source 上绑定的 link
     */
    public getLink(): StructureLink | undefined {
        const { LinkId } = this.room.memory.source?.[this.id]
        if (!LinkId) return undefined

        const link = Game.getObjectById(LinkId)
        if (!link) {
            delete this.room.memory.source[this.id].LinkId
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