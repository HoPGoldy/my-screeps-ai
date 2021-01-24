/**
 * 要建造工地的位置
 */
interface ConstructionPos<StructureType extends BuildableStructureConstant = BuildableStructureConstant> {
    /**
     * 要建造到的位置
     */
    pos: RoomPosition
    /**
     * 要建造的建筑类型
     */
    type: StructureType
    /**
     * 工地的 id，会在查找后自动填入
     */
    id?: Id<ConstructionSite<StructureType>>
}
