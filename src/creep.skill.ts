interface ICreepSkill {
    fillSpawnEngry(): boolean
    fillTower(): boolean
    buildStructure(): boolean
    transferTo(target: Structure, RESOURCE: ResourceConstant): void
    getObjectById<T>(id: string|undefined): T|null
}

/**
 * Creep 原型拓展 - 技能
 * 为每个 creep 添加的工作方法
 */
export const creepSkill: ICreepSkill = {
    /**
     * 填充本房间内所有 extension
     */
    fillSpawnEngry() {
        let target: StructureExtension|StructureSpawn|undefined = this.pos.findClosestByPath(FIND_STRUCTURES, {
            filter: s => (s.structureType == STRUCTURE_EXTENSION ||
                s.structureType == STRUCTURE_SPAWN) && 
                (s.energy < s.energyCapacity)
        })
        // 能量都已经填满
        if (!target) return false

        this.transferTo(target, RESOURCE_ENERGY)
        return true
    },
    /**
     * 填充本房间内所有 tower
     */
    fillTower() {
        const target: StructureTower|undefined = this.pos.findClosestByPath(FIND_STRUCTURES, {
            filter: s => s.structureType == STRUCTURE_TOWER && 
                s.energy < s.energyCapacity
        })
        // 能量都已经填满
        if (!target) return false

        this.transferTo(target, RESOURCE_ENERGY)
        return true
    },
    /**
     * 建设房间内存在的建筑工地
     */
    buildStructure() {
        const targets: StructureConstructor = this.room.find(FIND_CONSTRUCTION_SITES)
        // 找到就去建造
        if (targets.length > 0) {
            if(this.build(targets[0]) == ERR_NOT_IN_RANGE) {
                this.moveTo(targets[0])
            }
            return true
        }
        else {
            return false
        }
    },
    /**
     * 转移资源到结构
     * 
     * @param {Structure} target 要转移到的目标
     * @param {ResourceConstant} RESOURCE 要转移的资源类型
     */
    transferTo(target, RESOURCE) {
        // 转移能量实现
        if(this.transfer(target, RESOURCE) == ERR_NOT_IN_RANGE) {
            this.moveTo(target)
        }
    },
    /**
     * 通过 id 获取对象
     * @param id 游戏中的对象id 
     */
    getObjectById<T>(id: string|undefined): T|null {
        return Game.getObjectById(id)
    }
}