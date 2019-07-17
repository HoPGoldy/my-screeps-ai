const repair = () => {
    /**
     * @todo 防御塔写死了
     */
    const tower = Game.getObjectById('5d21a693ad1ea5150aad0dfb')
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
    repair
}