"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var role_1 = require("./role");
exports.creepConfigs = {
    E1harvester1: role_1.default.harvester('ef990774d80108c', 'Spawn1'),
    E1upgrader1: role_1.default.upgrader('ef990774d80108c', 'Spawn1'),
    E1upgrader2: role_1.default.upgrader('ef990774d80108c', 'Spawn1'),
    E1builder1: role_1.default.builder('ba3c0774d80c3a8', 'Spawn1'),
    E1builder2: role_1.default.builder('ef990774d80108c', 'Spawn1'),
    E1repairer1: role_1.default.repairer('ba3c0774d80c3a8', 'Spawn1')
};
exports.creepDefaultMemory = {
    role: '',
    working: false,
    hasSendRebirth: false
};
