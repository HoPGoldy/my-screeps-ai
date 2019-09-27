import role from './role'

/**
 * creep 配置项 (重要)
 * 
 * 此列表标记了所有 creep 的信息和要执行的逻辑
 * creep 的日常升级也应通过修改该列表完成
 * [键名]: 该 creep 的角色(role)
 * [值]: 该 creep 的全部信息
 * 
 * 在新增完后应手动执行全局的 reset 方法来将新增的 creep 添加到待生成队列
 * 而对 creep 逻辑的修改会直接生效
 */
export const creepConfigs: ICreepConfigs = {
    // 房间基本配置
    // E1harvester1: role.harvester('ef990774d80108c', 'Spawn1', [ WORK, CARRY, MOVE ]), // 矿工
    // E1upgrader1: role.upgrader('ef990774d80108c', 'Spawn1', [ [ WORK, CARRY, MOVE ] ]), // 升级者
    // E1builder1: role.builder('ba3c0774d80c3a8', 'Spawn1', [ [ WORK, CARRY, MOVE ] ]), // 建筑工
    // E1repairer1: role.repairer('ba3c0774d80c3a8', 'Spawn1', [ [ WORK, CARRY, MOVE ] ]), // 维修者
    // E1TowerTransfer1: role.towerTransfer('ba3c0774d80c3a8', 'Spawn1'), // 防御塔填充

    // 拓展组
    // W1N7Claimer1: role.claimer('Spawn1'), // 占领者, 占领后及时注释, 不然会一直生成
    // WIN7Supporter1: role.remoteBuilder('W1N8', 'ab9e0774d1c107c', 'Spawn1'), // 建筑工
    // WIN7RemoteUpgrader1: role.remoteUpgrader('W1N8', 'ab9e0774d1c107c', 'Spawn1'), // 升级者
}

// creep 的默认内存
export const creepDefaultMemory: CreepMemory = {
    role: '',
    working: false,
    hasSendRebirth: false
}

/**
 * 每个房间都应该定义一个默认 creep 
 * 这个 creep 角色会在房间里 creep 死完时以最小身体部件生成
 */
export const roomDefaultCreep = {
    E1: 'E1harvester1'
}