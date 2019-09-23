"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var mount_1 = require("./mount");
var global_spawn_1 = require("./global.spawn");
var global_room_1 = require("./global.room");
var global_creep_1 = require("./global.creep");
var utils_1 = require("./utils");
module.exports.loop = function () {
    mount_1.default();
    global_spawn_1.default();
    global_room_1.default();
    global_creep_1.default();
    utils_1.clearDiedCreep();
};
