const { myInfo } = require('config')

const towerWork = () => {
    const Home = Game.spawns['Spawn1']
    const towers = Home.room.find(FIND_MY_STRUCTURES, {
        filter: structure => structure.structureType == STRUCTURE_TOWER && structure.energy > 0
    })

    towers.map(tower => {
        if (attack(tower)) {
            // console.log('attack!')
        }
        else if (repair(tower)) {
            // console.log('repair')
        }
    })
}

const attack = (tower) => {
    // 找到最近的敌方 creep
    const enemy = tower.pos.findClosestByRange(FIND_CREEPS, {
        filter: creep => {
            return creep.owner.username != myInfo.name
        }
    })
    // 如果有就进攻
    if (enemy) {
        tower.attack(enemy)
        return true
    }
    else {
        return false
    }
}

const repair = (tower) => {
    // 找到最近的受损建筑
    const closestDamagedStructure = tower.pos.findClosestByRange(FIND_STRUCTURES, {
        filter: (structure) => structure.hits < structure.hitsMax && structure.structureType != STRUCTURE_WALL
    })
    // 如果有的话则进行修复
    if(closestDamagedStructure) {
        tower.repair(closestDamagedStructure)
        return true
    }
}

module.exports = {
    towerWork,
    repair
}