/**
 * Flag 原型拓展
 * 为每个 flag 添加的方法
 */
export default function () {
    _.assign(Flag.prototype, FlagExtension.prototype)
}

class FlagExtension extends Flag {
    /**
     * 获取旗子所在方块的建筑
     * 
     * @returns 所有位于该方格的建筑
     */
    getStructureByFlag(): Structure<StructureConstant>[] {
        // 查找旗帜那一格的建筑
        const targets = this.room.lookForAtArea(LOOK_STRUCTURES, this.pos.y, this.pos.x, this.pos.y, this.pos.x, true)
        return targets.map(target => target.structure)
    }
}