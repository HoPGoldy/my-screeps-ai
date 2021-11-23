/**
 * Factory 原型拓展
 */
export default class FactoryExtension extends StructureFactory {
    public onWork (): void {
        this.room.myTerminal.run()
    }

    /**
     * 建造完成回调
     * 修改 miner 的存放位置
     */
    public onBuildComplete (): void {
        // 有 extractor 了，发布矿工并添加对应的共享协议
        if (this.room.extractor) {
            this.room.spawner.release.miner()
        }
        this.room.myTerminal.resetConfig()
    }
}
