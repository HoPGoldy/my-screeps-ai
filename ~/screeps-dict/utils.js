"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var pathMap = {
    default: '#ffffff',
    havest: '#CCFF99',
    upgrade: '#99CCFF',
    build: '#FFCC99',
    attack: '#DC143C',
    claimer: 'Indigo'
};
function getPath(pathName) {
    var pathColor = (pathName in pathMap) ?
        pathMap[pathName] :
        pathMap['default'];
    return {
        visualizePathStyle: {
            stroke: pathColor
        }
    };
}
exports.getPath = getPath;
function updateStateDefaultCallback(creep, working) { }
function updateState(creep, workingMsg, onStateChange) {
    if (workingMsg === void 0) { workingMsg = '🧰 工作'; }
    if (onStateChange === void 0) { onStateChange = updateStateDefaultCallback; }
    if (creep.carry.energy <= 0 && creep.memory.working) {
        creep.memory.working = false;
        creep.say('⚡ 挖矿');
        onStateChange(creep, creep.memory.working);
    }
    if (creep.carry.energy >= creep.carryCapacity && !creep.memory.working) {
        creep.memory.working = true;
        creep.say(workingMsg);
        onStateChange(creep, creep.memory.working);
    }
    return creep.memory.working;
}
exports.updateState = updateState;
function clearDiedCreep() {
    if (Game.time % 1000)
        return false;
    for (var name_1 in Memory.creeps) {
        if (!Game.creeps[name_1]) {
            delete Memory.creeps[name_1];
            console.log('清除死去蠕虫记忆', name_1);
        }
    }
    return true;
}
exports.clearDiedCreep = clearDiedCreep;
function getRoomList() {
    var rooms = [];
    for (var spawnName in Game.spawns) {
        rooms.push(Game.spawns[spawnName].room.name);
    }
    return _.uniq(rooms);
}
exports.getRoomList = getRoomList;
