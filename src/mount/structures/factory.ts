/**
 * Factory 原型拓展
 */
export default class FactoryExtension extends StructureFactory {
    public onWork(): void {
        this.room.myFactory.runFactory()
    }
}