"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var defaultBodys = [WORK, CARRY, MOVE];
function default_1(targetRoomName, sourceId, spawnName, bodys) {
    if (bodys === void 0) { bodys = defaultBodys; }
    var config = {
        source: [{
                func: 'supportTo',
                args: [targetRoomName]
            }, {
                func: 'getEngryFrom',
                args: [Game.getObjectById(sourceId), 'harvest']
            }],
        target: [{
                func: 'supportTo',
                args: [targetRoomName]
            }, {
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
