/**
 * container 拓展
 */
export default class ContainerExtension extends StructureContainer {
    onBuildComplete () {
        // 找到身边第一个没有设置 container 的 source
        const nearSource = this.pos.findInRange(FIND_SOURCES, 1, {
            filter: source => !source.getContainer()
        })
        if (nearSource[0]) nearSource[0].setContainer(this)

        // 外矿的 containre 不会进行运营策略变更
        if (this.room.controller.level < 1) return false
        this.room.strategy.operation.changeForStartContainer()
    }
}
