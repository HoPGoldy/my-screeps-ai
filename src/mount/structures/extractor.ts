/**
 * Extractor 拓展
 */
export default class ExtractorExtension extends StructureExtractor {
    public onBuildComplete(): void {
        // 如果终端造好了就发布挖矿任务
        if (this.room.terminal) this.room.work.updateTask({ type: 'mine', need: 1 })
    }
}