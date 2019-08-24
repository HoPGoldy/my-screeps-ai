import { creepDefaultMemory } from './config.creep'
import { claimerConfig, soldierConfig } from './config.battle'

export default function (): void {
    global.b = {
        c: shout,
        sc: spawnClaimer,
        ss: spawnSoldier
    }
}

/**
 * 所有士兵骂骂咧咧
 */
function shout(): void {
    console.log('呼哈！')
}

/**
 * 生成占领者
 * 从指定房间生成指定身体部件的 claimer
 * 
 * @param roomName 要进行生产的房间
 * @param bodys 占领者的身体组成
 */
function spawnClaimer(roomName: string, bodys: BodyPartConstant[] = []) {
    const room: Room = Game.rooms[roomName]
    if (!room) {
        console.log(`${roomName} 并不是一个有效的房间名`)
        return false
    }
    const spawn: StructureSpawn = room.find(FIND_MY_SPAWNS)[0]

    // 定义名称、内存及身体部分
    const creepName: string = 'claimer' + Game.time
    let creepMemory = _.cloneDeep(creepDefaultMemory)
    creepMemory.role = 'claimer'
    let creepBodys = bodys.length > 0 ? bodys : claimerConfig.bodys
    // 生成 claimer
    const spawnResult = spawn.spawnCreep(creepBodys, creepName, {
        memory: creepMemory
    })
    if (spawnResult == OK) console.log(`${roomName} ${spawn.name} 正在生成 claimer`)
    else if (spawnResult == ERR_NOT_ENOUGH_ENERGY) console.log(`${roomName} 能量不足`)
}

/**
 * 生成士兵 soldier
 * 
 * @param roomName 要进行生成的房间
 * @param squad 小队
 * @param bodys 士兵的身体组成
 */
function spawnSoldier(roomName: string, squad: number = 1, bodys: BodyPartConstant[] = []): boolean {
    const room = Game.rooms[roomName]
    if (!room) {
        console.log(`${roomName} 并不是一个有效的房间名`)
        return false
    }
    // 获取可用的 spawn
    const spawn: StructureSpawn = room.find(FIND_MY_SPAWNS)[0]

    // 定义名称、内存及身体部分
    const creepName = 'soldier' + Game.time
    let creepMemory = _.cloneDeep(creepDefaultMemory)
    creepMemory.role = 'soldier'
    creepMemory.squad = squad
    let creepBodys = bodys.length > 0 ? bodys : soldierConfig.bodys
    // 生成 soldier
    const spawnResult = spawn.spawnCreep(creepBodys, creepName, {
        memory: creepMemory
    })
    if (spawnResult == OK) console.log(`${roomName} ${spawn.name} 正在生成 soldier`)
    else if (spawnResult == ERR_NOT_ENOUGH_ENERGY) console.log(`${roomName} 能量不足`)
    else console.log(spawnResult)
}