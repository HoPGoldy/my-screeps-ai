import { creepConfigs } from './config.creep';
import { updateState } from './utils';
export default function () {
    for (const creepName in Game.creeps) {
        singleCreepWork(Game.creeps[creepName]);
    }
}
function singleCreepWork(creep) {
    if (!(creep.memory.role in creepConfigs)) {
        console.log(`creep ${creep.name} 内存属性 role 不属于任何已存在的 creepConfigs 名称`);
        return false;
    }
    const creepConfig = creepConfigs[creep.memory.role];
    const working = updateState(creep);
    if (working)
        creep[creepConfig.target.func](...creepConfig.target.args);
    else
        creep[creepConfig.source.func](...creepConfig.source.args);
    if (!creep.memory.hasSendRebirth) {
        const health = isCreepHealth(creep);
        if (!health) {
            Memory.spawnList.push(creep.memory.role);
            creep.memory.hasSendRebirth = true;
        }
    }
}
function isCreepHealth(creep) {
    if (creep.ticksToLive <= 10 || creep.hits < creep.hitsMax / 2)
        return false;
    else
        return true;
}
