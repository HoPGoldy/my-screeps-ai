/**
 * observer 拓展
 */
export default class ObserverExtension extends StructureObserver {
    public onWork (): void {
        this.room.myObserver.run()
    }
}
