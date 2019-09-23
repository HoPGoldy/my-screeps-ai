"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var mount_creep_1 = require("./mount.creep");
var mount_global_1 = require("./mount.global");
function default_1() {
    if (!global.hasExtension) {
        console.log('[mount] 重新挂载拓展');
        global.hasExtension = true;
        mount_global_1.default();
        mount_creep_1.default();
    }
}
exports.default = default_1;
