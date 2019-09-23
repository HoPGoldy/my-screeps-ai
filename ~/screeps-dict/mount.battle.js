"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var config_creep_1 = require("./config.creep");
var config_battle_1 = require("./config.battle");
function default_1() {
    global.b = {
        c: shout,
        sc: spawnClaimer,
        ss: spawnSoldier
    };
}
exports.default = default_1;
function shout() {
    console.log('呼哈！');
}
function spawnClaimer(roomName, bodys) {
    if (bodys === void 0) { bodys = []; }
    var room = Game.rooms[roomName];
    if (!room) {
        console.log(roomName + " \u5E76\u4E0D\u662F\u4E00\u4E2A\u6709\u6548\u7684\u623F\u95F4\u540D");
        return false;
    }
    var spawn = room.find(FIND_MY_SPAWNS)[0];
    var creepName = 'claimer' + Game.time;
    var creepMemory = _.cloneDeep(config_creep_1.creepDefaultMemory);
    creepMemory.role = 'claimer';
    var creepBodys = bodys.length > 0 ? bodys : config_battle_1.claimerConfig.bodys;
    var spawnResult = spawn.spawnCreep(creepBodys, creepName, {
        memory: creepMemory
    });
    if (spawnResult == OK)
        console.log(roomName + " " + spawn.name + " \u6B63\u5728\u751F\u6210 claimer");
    else if (spawnResult == ERR_NOT_ENOUGH_ENERGY)
        console.log(roomName + " \u80FD\u91CF\u4E0D\u8DB3");
}
function spawnSoldier(roomName, squad, bodys) {
    if (squad === void 0) { squad = 1; }
    if (bodys === void 0) { bodys = []; }
    var room = Game.rooms[roomName];
    if (!room) {
        console.log(roomName + " \u5E76\u4E0D\u662F\u4E00\u4E2A\u6709\u6548\u7684\u623F\u95F4\u540D");
        return false;
    }
    var spawn = room.find(FIND_MY_SPAWNS)[0];
    var creepName = 'soldier' + Game.time;
    var creepMemory = _.cloneDeep(config_creep_1.creepDefaultMemory);
    creepMemory.role = 'soldier';
    creepMemory.squad = squad;
    var creepBodys = bodys.length > 0 ? bodys : config_battle_1.soldierConfig.bodys;
    var spawnResult = spawn.spawnCreep(creepBodys, creepName, {
        memory: creepMemory
    });
    if (spawnResult == OK)
        console.log(roomName + " " + spawn.name + " \u6B63\u5728\u751F\u6210 soldier");
    else if (spawnResult == ERR_NOT_ENOUGH_ENERGY)
        console.log(roomName + " \u80FD\u91CF\u4E0D\u8DB3");
    else
        console.log(spawnResult);
}
