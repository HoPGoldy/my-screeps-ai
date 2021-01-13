interface Source {
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