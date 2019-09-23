"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function default_1(room) {
    var towers = room.find(FIND_MY_STRUCTURES, {
        filter: function (s) { return s.structureType == STRUCTURE_TOWER && s.energy > 0; }
    });
    towers.map(function (tower) {
        if (attack(tower, room.name)) { }
    });
}
exports.default = default_1;
function attack(tower, roomName) {
    var enemys = Memory[roomName].radarResult.enemys;
    if (enemys.length <= 0)
        return false;
    tower.attack(tower.pos.findClosestByRange(enemys));
    return true;
}
function repair(tower) {
    var closestDamagedStructure = tower.pos.findClosestByRange(FIND_MY_STRUCTURES, {
        filter: function (structure) { return structure.hits < structure.hitsMax; }
    });
    if (closestDamagedStructure) {
        tower.repair(closestDamagedStructure);
        return true;
    }
    return false;
}
