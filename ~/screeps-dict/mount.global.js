"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var config_creep_1 = require("./config.creep");
function default_1() {
    funcAlias.map(function (item) {
        Object.defineProperty(global, item.alias, { get: exports.globalExtension[item.funcName] });
    });
}
exports.default = default_1;
var funcAlias = [
    { alias: 'reset', funcName: 'resetConfig' }
];
exports.globalExtension = {
    resetConfig: function () {
        var aliveCreepRoles = [];
        var missCreep = [];
        for (var creepName in Game.creeps) {
            aliveCreepRoles.push(Game.creeps[creepName].memory.role);
        }
        var _loop_1 = function (configName) {
            if (_.find(aliveCreepRoles, function (role) { return role == configName; }))
                return "continue";
            else if (_.find(Memory.spawnList, function (role) { return role == configName; }))
                return "continue";
            else {
                Memory.spawnList.push(configName);
                missCreep.push(configName);
            }
        };
        for (var configName in config_creep_1.creepConfigs) {
            _loop_1(configName);
        }
        return "\u53D1\u73B0\u7F3A\u5931\u7684 creep \u5982\u4E0B: " + missCreep.join(', ') + "\u3002 \u5DF2\u52A0\u5165\u751F\u6210\u961F\u5217";
    }
};
