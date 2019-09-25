// 挂载拓展到 tower 原型
export default function () {
    _.assign(StructureTower.prototype, TowerExtension.prototype)
}

class TowerExtension extends StructureTower {
    /**
     * 主要任务
     */
    public work(): void {
        // 先攻击敌人
        if (this.commandAttack()) { }
        // 找不到敌人再维修建筑
        else if (this.commandRepair()) { }
    }

    /**
     * 攻击指令
     * 检查本房间是否有敌人，有的话则攻击
     * 
     * @todo 缓存
     * @returns 有敌人返回 true，没敌人返回 false
     */
    public commandAttack(): boolean {
        const enemy = this.pos.findClosestByRange(FIND_HOSTILE_CREEPS)

        if (!enemy) return false
        this.attack(enemy)
        return true
    }

    /**
     * 维修指令
     * 维修受损的建筑，不维修 WALL 和 RAMPART
     * 
     * @returns 进行维修返回true，没有维修返回false
     */
    public commandRepair(): boolean {
        // 找到最近的受损建筑
        const closestDamagedStructure: AnyStructure = this.pos.findClosestByRange(FIND_STRUCTURES, {
            filter: s => s.hits < s.hitsMax && s.structureType != STRUCTURE_RAMPART && s.structureType != STRUCTURE_WALL
        })
        // 如果有的话则进行修复
        if(closestDamagedStructure) {
            this.repair(closestDamagedStructure)
            return true
        }
        return false
    }
}