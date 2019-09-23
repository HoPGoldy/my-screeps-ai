export default {
    fillSpawnEngry() {
        let target = this.pos.findClosestByPath(FIND_STRUCTURES, {
            filter: s => (s.structureType == STRUCTURE_EXTENSION ||
                s.structureType == STRUCTURE_SPAWN) &&
                (s.energy < s.energyCapacity)
        });
        if (!target)
            return false;
        this.transferTo(target, RESOURCE_ENERGY);
        return true;
    },
    fillTower() {
        const target = this.pos.findClosestByPath(FIND_STRUCTURES, {
            filter: s => s.structureType == STRUCTURE_TOWER &&
                s.energy < s.energyCapacity
        });
        if (!target)
            return false;
        this.transferTo(target, RESOURCE_ENERGY);
        return true;
    },
    buildStructure() {
        const targets = this.room.find(FIND_CONSTRUCTION_SITES);
        if (targets.length > 0) {
            if (this.build(targets[0]) == ERR_NOT_IN_RANGE) {
                this.moveTo(targets[0]);
            }
            return true;
        }
        else {
            return false;
        }
    },
    getEngryFrom(target, getFunc, ...args) {
        if (this[getFunc](target, ...args) == ERR_NOT_IN_RANGE) {
            this.moveTo(target);
        }
    },
    transferTo(target, RESOURCE) {
        if (this.transfer(target, RESOURCE) == ERR_NOT_IN_RANGE) {
            this.moveTo(target);
        }
    },
    getObjectById(id) {
        return Game.getObjectById(id);
    }
};
