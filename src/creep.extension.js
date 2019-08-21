const havestPath = require('moveSetting').getPath('havest')

/**
 * Creep 原型拓展
 * 为每个 creep 添加的基础属性及方法
 */
const creepExtension = {
    /**
     * 填充本房间内所有 extension
     */
    fillSpawnEngry() {
        let target = this.pos.findClosestByPath(FIND_STRUCTURES, {
            filter: structure => {
                /**
                 * 条件优先满足：能量没有到达上限
                 * 然后根据排序挑选建筑：拓展 > 重生点
                 */
                return (structure.energy < structure.energyCapacity) && (
                    structure.structureType == STRUCTURE_EXTENSION ||
                    structure.structureType == STRUCTURE_SPAWN)
            }
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
        const target = this.pos.findClosestByPath(FIND_STRUCTURES, {
            filter: structure => structure.structureType == STRUCTURE_TOWER && 
                                 structure.energy < structure.energyCapacity
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
        const targets = this.room.find(FIND_CONSTRUCTION_SITES)
        // 找到就去建造
        if (targets.length > 0) {
            if(this.build(targets[0]) == ERR_NOT_IN_RANGE) {
                creep.moveTo(target, buildPath)
            }
            return true
        }
        else {
            return false
        }
        
    },
    transferTo(target, RESOURCE) {
        // 转移能量实现
        if(this.transfer(target, RESOURCE) == ERR_NOT_IN_RANGE) {
            this.moveTo(target, havestPath)
        }
    }
}

/**
 * 将 creep 拓展签入原型
 */
module.exports = function() {
    Object.assign(Creep.prototype, creepExtension)
}