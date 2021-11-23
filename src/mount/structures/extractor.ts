/**
 * Extractor 拓展
 */
export default class ExtractorExtension extends StructureExtractor {
    public onBuildComplete (): void {
        // 如果终端造好了就孵化采集单位
        if (this.room.terminal) this.room.spawner.release.miner()
    }
}
