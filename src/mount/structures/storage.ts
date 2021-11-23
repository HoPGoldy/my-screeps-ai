/**
 * Storage 拓展
 */
export default class StorageExtension extends StructureStorage {
    public onWork (): void {
        this.room.myStorage.run()
    }
}
