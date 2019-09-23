import { creepConfigs, creepDefaultMemory } from './config.creep';
export default function () {
    if (!hasSpawnList())
        return false;
    const spawnList = Memory.spawnList;
    let complateSpawnIndexList = [];
    for (let index = 0; index < spawnList.length; index++) {
        if (singleSpawnWork(spawnList[index]))
            complateSpawnIndexList.push(index);
        else
            break;
    }
    complateSpawnIndexList.reverse().forEach(index => Memory.spawnList.splice(index, 1));
    return true;
}
function hasSpawnList() {
    return Memory.spawnList ? true : false;
}
function spawnCreep(spawn, configName) {
    const creepConfig = creepConfigs[configName];
    let creepMemory = _.cloneDeep(creepDefaultMemory);
    creepMemory.role = configName;
    const spawnResult = spawn.spawnCreep(creepConfig.bodys, configName + Game.time, {
        memory: creepMemory
    });
    if (spawnResult == OK) {
        console.log(`spawn ${creepConfig.spawn} 正在生成 ${configName} ...`);
        return true;
    }
    else {
        console.log(`spawn ${creepConfig.spawn} 生成失败, 任务 ${configName} 挂起, 错误码 ${spawnResult}`);
        return false;
    }
}
function singleSpawnWork(configName) {
    const creepConfig = creepConfigs[configName];
    if (!(creepConfig.spawn in Game.spawns)) {
        console.log(`creepConfig - ${configName} spawn 名称异常`);
        return false;
    }
    const spawn = Game.spawns[creepConfig.spawn];
    if (spawn.spawning) {
        console.log(`spawn ${creepConfig.spawn} 正在生成, 任务 ${configName} 挂起`);
        return false;
    }
    if (!spawnCreep(spawn, configName))
        return false;
    return true;
}
