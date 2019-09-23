"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var config_creep_1 = require("./config.creep");
var mount_global_1 = require("./mount.global");
function default_1() {
    syncCreepConfig();
    if (!hasSpawnList())
        Memory.spawnList = [];
    var spawnList = Memory.spawnList;
    var complateSpawnIndexList = [];
    for (var index = 0; index < spawnList.length; index++) {
        if (singleSpawnWork(spawnList[index]))
            complateSpawnIndexList.push(index);
    }
    complateSpawnIndexList.reverse().forEach(function (index) { return Memory.spawnList.splice(index, 1); });
    return true;
}
exports.default = default_1;
function hasSpawnList() {
    return Memory.spawnList ? true : false;
}
function singleSpawnWork(configName) {
    var creepConfig = config_creep_1.creepConfigs[configName];
    if (!(creepConfig.spawn in Game.spawns)) {
        console.log("creepConfig - " + configName + " spawn \u540D\u79F0\u5F02\u5E38");
        return false;
    }
    var spawn = Game.spawns[creepConfig.spawn];
    if (spawn.spawning) {
        console.log("spawn " + creepConfig.spawn + " \u6B63\u5728\u751F\u6210, \u4EFB\u52A1 " + configName + " \u6302\u8D77");
        return false;
    }
    if (!spawnCreep(spawn, configName))
        return false;
    return true;
}
function spawnCreep(spawn, configName) {
    var creepConfig = config_creep_1.creepConfigs[configName];
    var creepMemory = _.cloneDeep(config_creep_1.creepDefaultMemory);
    creepMemory.role = configName;
    var spawnResult = spawn.spawnCreep(creepConfig.bodys, configName + Game.time, {
        memory: creepMemory
    });
    if (spawnResult == OK) {
        console.log(creepConfig.spawn + " \u6B63\u5728\u751F\u6210 " + configName + " ...");
        return true;
    }
    else {
        console.log(creepConfig.spawn + " \u751F\u6210\u5931\u8D25, \u4EFB\u52A1 " + configName + " \u6302\u8D77, \u9519\u8BEF\u7801 " + spawnResult);
        return false;
    }
}
function syncCreepConfig() {
    if (Game.time % 1000)
        return false;
    console.log('[spawn] 同步配置项');
    mount_global_1.globalExtension.resetConfig();
}
