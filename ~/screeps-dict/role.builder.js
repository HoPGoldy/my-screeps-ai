"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var defaultBodys = [WORK, CARRY, MOVE, WORK];
function default_1(sourceId, spawnName, bodys) {
    if (bodys === void 0) { bodys = defaultBodys; }
    var config = {
        source: [{
                func: 'getEngryFrom',
                args: [Game.getObjectById(sourceId), 'harvest']
            }],
        target: [{
                func: 'buildStructure',
                args: []
            }],
        switch: {
            func: 'updateState',
            args: []
        },
        spawn: spawnName,
        bodys: bodys
    };
    return config;
}
exports.default = default_1;
