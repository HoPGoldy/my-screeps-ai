"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var config_creep_1 = require("./config.creep");
var utils_1 = require("./utils");
function default_1() {
    for (var creepName in Game.creeps) {
        singleCreepWork(Game.creeps[creepName]);
    }
}
exports.default = default_1;
function singleCreepWork(creep) {
    if (!(creep.memory.role in config_creep_1.creepConfigs)) {
        console.log("creep " + creep.name + " \u5185\u5B58\u5C5E\u6027 role \u4E0D\u5C5E\u4E8E\u4EFB\u4F55\u5DF2\u5B58\u5728\u7684 creepConfigs \u540D\u79F0");
        return false;
    }
    var creepConfig = config_creep_1.creepConfigs[creep.memory.role];
    var working = utils_1.updateState(creep);
    if (working) {
        creepConfig.target.map(function (action) {
            creep[action.func].apply(creep, action.args);
        });
    }
    else {
        creepConfig.source.map(function (action) {
            creep[action.func].apply(creep, action.args);
        });
    }
    if (!creep.memory.hasSendRebirth) {
        var health = isCreepHealth(creep);
        if (!health) {
            Memory.spawnList.push(creep.memory.role);
            creep.memory.hasSendRebirth = true;
        }
    }
}
function isCreepHealth(creep) {
    if (creep.ticksToLive <= 10 || creep.hits < creep.hitsMax / 2)
        return false;
    else
        return true;
}
