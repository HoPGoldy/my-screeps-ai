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
    // W1N7 配置
    E1harvester1: role.harvester('ef990774d80108c', 'Spawn1', [ WORK, CARRY, MOVE, WORK, CARRY, MOVE, WORK, CARRY, MOVE ]),
    E1upgrader1: role.upgrader('ef990774d80108c', 'Spawn1', [ WORK, CARRY, MOVE, WORK, CARRY, MOVE, WORK, CARRY, MOVE ]),
    E1builder1: role.builder('ba3c0774d80c3a8', 'Spawn1', [ WORK, CARRY, MOVE, WORK, CARRY, MOVE, WORK, CARRY, MOVE ]),
    E1repairer1: role.repairer('ba3c0774d80c3a8', 'Spawn1', [ WORK, CARRY, MOVE, WORK, CARRY, MOVE, WORK, CARRY, MOVE ]),
    W1N7TowerTransfer1: role.towerTransfer('ba3c0774d80c3a8', 'Spawn1'),

    // W1N8 配置
    W1N8Harvester1: role.harvester('ab9e0774d1c107c', 'Spawn2', [ WORK, CARRY, MOVE]),
    W1N8Upgrader1: role.upgrader('ab9e0774d1c107c', 'Spawn2', [ WORK, CARRY, MOVE]),
    W1N8Bbilder1: role.builder('ab9e0774d1c107c', 'Spawn2', [ WORK, CARRY, MOVE]),
    W1N8Repairer1: role.repairer('f5680774d1c1fe8', 'Spawn2', [ WORK, CARRY, MOVE]),
    W1N8TowerTransfer1: role.towerTransfer('f5680774d1c1fe8', 'Spawn2', [ WORK, CARRY, MOVE]),

    // W3N7 配置
    W3N7Harvester1: role.harvester('eff307740862fd8', 'Spawn3', [ WORK, CARRY, MOVE]),
    W3N7Upgrader1: role.upgrader('eff307740862fd8', 'Spawn3', [ WORK, CARRY, MOVE]),
    W3N7Bbilder1: role.builder('eee50774086309c', 'Spawn3', [ WORK, CARRY, MOVE]),
    W3N7Repairer1: role.repairer('eee50774086309c', 'Spawn3', [ WORK, CARRY, MOVE]),
    W3N7TowerTransfer1: role.towerTransfer('eee50774086309c', 'Spawn3', [ WORK, CARRY, MOVE]),

    // W3N8 配置
    W3N8Harvester1: role.harvester('ebdd0774017409d', 'Spawn4', [ WORK, CARRY, MOVE]),
    W3N8Upgrader1: role.upgrader('ebdd0774017409d', 'Spawn4', [ WORK, CARRY, MOVE]),
    W3N8Bbilder1: role.builder('9d330774017e6b9', 'Spawn4', [ WORK, CARRY, MOVE]),
    W3N8Repairer1: role.repairer('9d330774017e6b9', 'Spawn4', [ WORK, CARRY, MOVE]),
    W3N8TowerTransfer1: role.towerTransfer('9d330774017e6b9', 'Spawn4', [ WORK, CARRY, MOVE]),

    // 拓展组
    // W1N7Claimer1: role.claimer('Spawn1'),
    // WIN7Supporter1: role.supporter('W1N8', 'ab9e0774d1c107c', 'Spawn1'),
    // WIN7RemoteUpgrader1: role.remoteUpgrader('W1N8', 'ab9e0774d1c107c', 'Spawn1'),
}

// creep 的默认内存
export const creepDefaultMemory: CreepMemory = {
    role: '',
    working: false,
    hasSendRebirth: false
}