"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var room_rader_1 = require("./room.rader");
var room_tower_1 = require("./room.tower");
var utils_1 = require("./utils");
function default_1() {
    for (var _i = 0, _a = utils_1.getRoomList(); _i < _a.length; _i++) {
        var roomName = _a[_i];
        var room = Game.rooms[roomName];
        if (!(roomName in Memory))
            initRoom(room);
        room_rader_1.default(room);
        room_tower_1.default(room);
    }
}
exports.default = default_1;
function initRoom(room) {
    Memory[room.name] = {
        radarResult: {}
    };
}
