export const creepConfigs: ICreepConfigs = {
    E1harvester1: {
        source: {
            func: 'getObjectById',
            args: [ '123' ]
        },
        target: {
            func: 'getObjectById',
            args: [ '321' ]
        },
        spawn: 'Spawn1',
        bodys: [ WORK, CARRY, MOVE]
    }
}