const towerWork = () => {
    const Home = Game.spawns['Spawn1']
    const towers = Home.room.find(FIND_MY_STRUCTURES, {
        filter: structure => structure.structureType == STRUCTURE_TOWER && structure.energy > 0
    })

    towers.map(tower => {
        if (attack(tower)) {
            console.log('attack!')
        }
        else if (repair(tower)) {
            console.log('repair')
        }
    })
}

const attack = (tower) => {
    // const enemy = 
    return false
}

const repair = (tower) => {
    tower = Game.getObjectById('5d21a693ad1ea5150aad0dfb')
    
    if (tower) {
        // 找到最近的受损建筑
        const closestDamagedStructure = tower.pos.findClosestByRange(FIND_STRUCTURES, {
            filter: (structure) => structure.hits < structure.hitsMax && structure.structureType != STRUCTURE_WALL
        })
        // 如果有的话则进行修复
        if(closestDamagedStructure) {
            tower.repair(closestDamagedStructure)
        }
    }
    else {
        console.log('建筑物 - 防御塔 丢失！')
    }
}

module.exports = {
    towerWork,
    repair
}