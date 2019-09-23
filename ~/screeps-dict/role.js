"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var role_harvester_1 = require("./role.harvester");
var role_upgrader_1 = require("./role.upgrader");
var role_builder_1 = require("./role.builder");
var role_repairer_1 = require("./role.repairer");
exports.default = {
    harvester: role_harvester_1.default,
    upgrader: role_upgrader_1.default,
    builder: role_builder_1.default,
    repairer: role_repairer_1.default
};
