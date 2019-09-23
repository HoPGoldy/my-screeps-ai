"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var defaultBodys = [ATTACK, MOVE, MOVE];
function default_1(spawnName, bodys) {
    if (bodys === void 0) { bodys = defaultBodys; }
    var config = {
        source: [{
                func: 'standBy',
                args: []
            }],
        target: [{
                func: 'defense',
                args: []
            }],
        switch: {
            func: 'checkEnemy',
            args: []
        },
        spawn: spawnName,
        bodys: bodys
    };
    return config;
}
exports.default = default_1;
