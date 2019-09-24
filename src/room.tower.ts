/**
 * 防御塔工作
 * 先检查有没有敌人，没有敌人就执行维修
 * 
 * @param room 执行的房间
 */
export default function (room: Room): void {
    const towers: any[] = room.find(FIND_MY_STRUCTURES, {
        filter: s => s.structureType == STRUCTURE_TOWER && s.energy > 0
    })

    towers.map((tower: StructureTower) => {
        if (attack(tower, room.name)) {}
    })
}

/**
 * 攻击指令
 * 检查雷达扫描结果中是否包含敌人，有的话则发起进攻
 * 
 * @param tower 执行命令的 tower
 * @param roomName 所在的房间名称，用于获取其内存中的雷达扫描结果
 * @returns {boolean} 有敌人返回 true，没敌人返回 false
 */
function attack (tower: StructureTower, roomName: string): boolean {
    const enemys: Creep[] = Memory[roomName].radarResult.enemys

    if (enemys.length <= 0) return false
    // 找到最近的敌方 creep 并发起攻击
    tower.attack(tower.pos.findClosestByRange(enemys))
    return true
}

/**
 * 维修指令
 * 维修受损的建筑，不维修 WALL 和 RAMPART
 * 
 * @param tower 执行命令的 tower
 * @returns {boolean} 进行维修返回true，没有维修返回false
 */
function repair (tower: StructureTower): boolean {
    // 找到最近的受损建筑
    const closestDamagedStructure: AnyOwnedStructure = tower.pos.findClosestByRange(FIND_MY_STRUCTURES, {
        filter: structure => structure.hits < structure.hitsMax
    })
    // 如果有的话则进行修复
    if(closestDamagedStructure) {
        tower.repair(closestDamagedStructure)
        return true
    }
    return false
}