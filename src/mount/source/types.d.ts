interface Source {
    /**
     * 该 source 是否可以采集
     * 会检查自己还有没有能量，且周围有没有剩余开采位
     */
    canUse(): boolean
    /**
     * 设置能量丢弃位置
     */
    setDroppedPos(pos: RoomPosition): void
    /**
     * 获取该 source 丢弃位置及其上的能量
     */
    getDroppedInfo(): { pos?: RoomPosition, energy?: Resource<RESOURCE_ENERGY> }
    /**
     * 绑定 container 到该 source
     */
    setContainer(container: StructureContainer): void
    /**
     * 获取该 source 上绑定的 container
     */
    getContainer(): StructureContainer | undefined
    /**
     * 绑定 link 到该 source
     */
    setLink(link: StructureLink): void
    /**
     * 获取该 source 上绑定的 link
     */
    getLink(): StructureLink | undefined
}