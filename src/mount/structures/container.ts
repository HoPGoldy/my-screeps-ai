/**
 * container 拓展
 * 
 * 目前只有 source container，所以会在建造完成后把自己注册到对应 source 并发布对应任务
 */
export default class ContainerExtension extends StructureContainer {
    onBuildComplete() {
        // 找到身边第一个没有设置 container 的 source
        const nearSource = this.pos.findInRange(FIND_SOURCES, 1, {
            filter: source => !source.getContainer()
        })
        if (nearSource[0]) nearSource[0].setContainer(this)

        if (this.room.controller.level < 1) return false
        /**
         * 如果是在自己房间里就触发新的 creep 和任务发布
         * 更新家里的搬运工数量，几个 container 就发布其数量 * 3
         * @todo 这里没有考虑外矿的运输需求，等外矿模块完善后再修改
         */
        this.room.release.changeBaseUnit('worker', 3)
        this.room.work.updateTask({ type: 'upgrade' })
    }
}