"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var defaultBodys = [CLAIM, MOVE];
function default_1(targetRoomName, spawnName, bodys) {
    if (bodys === void 0) { bodys = defaultBodys; }
    var config = {
        source: [{
                func: 'claim',
                args: [targetRoomName]
            }],
        target: [],
        spawn: spawnName,
        bodys: bodys
    };
    return config;
}
exports.default = default_1;
