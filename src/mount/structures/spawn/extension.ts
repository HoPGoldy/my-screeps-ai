/**
 * Spawn 原型拓展
 */
export default class SpawnExtension extends StructureSpawn {
    public onWork(): void {
        this.room.spawner.runSpawn(this)
    }
}