"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function default_1() {
    _.assign(Creep.prototype, creepExtension);
}
exports.default = default_1;
var creepExtension = {
    updateState: function (workingMsg, onStateChange) {
        if (workingMsg === void 0) { workingMsg = '🧰 工作'; }
        if (onStateChange === void 0) { onStateChange = updateStateDefaultCallback; }
        if (this.carry.energy <= 0 && this.memory.working) {
            this.memory.working = false;
            this.say('⚡ 挖矿');
            onStateChange(this, this.memory.working);
        }
        if (this.carry.energy >= this.carryCapacity && !this.memory.working) {
            this.memory.working = true;
            this.say(workingMsg);
            onStateChange(this, this.memory.working);
        }
        return this.memory.working;
    },
    checkEnemy: function () {
        var enemys = Memory[this.room.name].radarResult.enemys;
        return enemys ? true : false;
    },
    standBy: function () {
        var standByFlag = Game.flags[this.room.name + " StandBy"];
        if (standByFlag)
            this.moveTo(standByFlag);
        else
            this.say("\u627E\u4E0D\u5230 [" + this.room.name + " StandBy] \u65D7\u5E1C");
    },
    defense: function () {
        var enemys = Memory[this.room.name].radarResult.enemys;
        var enemy = this.pos.findClosestByRange(enemys);
        this.say("\u6B63\u5728\u6D88\u706D " + enemy.name);
        this.moveTo(enemy.pos);
        this.attack(enemy);
    },
    fillSpawnEngry: function () {
        var target = this.pos.findClosestByPath(FIND_STRUCTURES, {
            filter: function (s) { return (s.structureType == STRUCTURE_EXTENSION ||
                s.structureType == STRUCTURE_SPAWN) &&
                (s.energy < s.energyCapacity); }
        });
        if (!target)
            return false;
        this.transferTo(target, RESOURCE_ENERGY);
        return true;
    },
    fillTower: function () {
        var target = this.pos.findClosestByPath(FIND_STRUCTURES, {
            filter: function (s) { return s.structureType == STRUCTURE_TOWER &&
                s.energy < s.energyCapacity; }
        });
        if (!target)
            return false;
        this.transferTo(target, RESOURCE_ENERGY);
        return true;
    },
    upgrade: function () {
        if (this.upgradeController(this.room.controller) == ERR_NOT_IN_RANGE) {
            this.moveTo(this.room.controller);
        }
    },
    buildStructure: function () {
        var targets = this.room.find(FIND_CONSTRUCTION_SITES);
        if (targets.length > 0) {
            if (this.build(targets[0]) == ERR_NOT_IN_RANGE) {
                this.moveTo(targets[0]);
            }
            return true;
        }
        else {
            this.upgrade();
            return false;
        }
    },
    supportTo: function (roomName) {
        if (this.room.name !== roomName) {
            var room = Game.rooms[roomName];
            if (!room) {
                console.log("[supportTo] " + roomName + " \u4E0D\u662F\u4E2A\u6709\u6548\u7684\u623F\u95F4");
                return false;
            }
            this.moveTo(Game.rooms[roomName]);
            return false;
        }
        return true;
    },
    repairStructure: function () {
        var target = this.pos.findClosestByRange(FIND_STRUCTURES, {
            filter: function (s) {
                return s.hits < (s.hitsMax) &&
                    s.structureType != STRUCTURE_WALL &&
                    s.structureType != STRUCTURE_RAMPART;
            }
        });
        if (!target) {
            target = this.pos.findClosestByRange(FIND_STRUCTURES, {
                filter: function (s) {
                    return s.hits < (s.hitsMax / 0.5) &&
                        s.structureType == STRUCTURE_WALL &&
                        s.structureType == STRUCTURE_RAMPART;
                }
            });
        }
        if (this.repair(target) == ERR_NOT_IN_RANGE) {
            this.moveTo(target);
        }
    },
    claim: function (roomName) {
        var room = Game.rooms[roomName];
        if (!room) {
            console.log("[claim] " + roomName + " \u4E0D\u662F\u4E00\u4E2A\u6709\u6548\u7684\u623F\u95F4");
            return false;
        }
        if (this.claimController(room.controller) == ERR_NOT_IN_RANGE) {
            this.moveTo(room.controller);
            return false;
        }
        return true;
    },
    getEngryFrom: function (target, getFunc) {
        var args = [];
        for (var _i = 2; _i < arguments.length; _i++) {
            args[_i - 2] = arguments[_i];
        }
        if (this[getFunc].apply(this, [target].concat(args)) == ERR_NOT_IN_RANGE) {
            this.moveTo(target);
        }
    },
    transferTo: function (target, RESOURCE) {
        if (this.transfer(target, RESOURCE) == ERR_NOT_IN_RANGE) {
            this.moveTo(target);
        }
    },
    getObjectById: function (id) {
        return Game.getObjectById(id);
    }
};
function updateStateDefaultCallback(creep, working) { }
