import { minerHervesteLimit } from "setting"
import { creepApi } from "modules/creepController"

/**
 * Extractor 拓展
 * 
 * 在刚刚建成时会在房间内存里写入 mineral 的 id
 * 并在资源来源表里注册自己
 */
export default class ExtractorExtension extends StructureExtractor {
    public work(): void {
        // 如果 mineral 冷却好了并且 terminal 还有空间就重新发布 miner
        if (Game.time > this.room.memory.mineralCooldown) {
            if (this.room.terminal && this.room.terminal.store.getUsedCapacity() < minerHervesteLimit) {
                delete this.room.memory.mineralCooldown

                creepApi.add(`${this.room.name} miner`, 'miner', {
                    sourceId: this.room.mineral.id,
                    targetId: this.room.terminal ? this.room.terminal.id : this.room.storage.id
                }, this.room.name)
            }
            else this.room.memory.mineralCooldown = Game.time + 10000
        }
    }

    /**
     * 更新 mineral id
     */
    public onBuildComplete(): void {
        // 如果终端造好了就发布矿工
        if (this.room.terminal) this.room.releaseCreep('miner')
    }
}