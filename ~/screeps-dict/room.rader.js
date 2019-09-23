"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function default_1(room) {
    Memory[room.name].radarResult = {
        enemys: getEnermy(room)
    };
}
exports.default = default_1;
function getEnermy(room) {
    var enemys = room.find(FIND_HOSTILE_CREEPS);
    return enemys ? enemys : null;
}
