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
    E1harvester1: role.harvester('ef990774d80108c', 'Spawn1'),
    W1N7harvester2: role.harvester('ba3c0774d80c3a8', 'Spawn1'),
    E1upgrader1: role.upgrader('ef990774d80108c', 'Spawn1'),
    E1upgrader2: role.upgrader('ef990774d80108c', 'Spawn1'),
    E1builder1: role.builder('ba3c0774d80c3a8', 'Spawn1'),
    E1builder2: role.builder('ef990774d80108c', 'Spawn1'),
    E1repairer1: role.repairer('ba3c0774d80c3a8', 'Spawn1'),
    W1N7TowerTransfer1: role.towerTransfer('ba3c0774d80c3a8', 'Spawn1'),

    // W1N7Claimer1: role.claimer('Spawn1'),
    WIN7Supporter1: role.supporter('W1N8', 'ab9e0774d1c107c', 'Spawn1'),
    WIN7RemoteUpgrader1: role.remoteUpgrader('W1N8', 'ab9e0774d1c107c', 'Spawn1'),

    W1N8Harvester1: role.harvester('ab9e0774d1c107c', 'Spawn2'),
    W1N8Upgrader1: role.upgrader('ab9e0774d1c107c', 'Spawn2'),

    WIN7Supporter3: role.supporter('W3N7', 'eee50774086309c', 'Spawn1'),
    WIN7RemoteUpgrader2: role.remoteUpgrader('W3N7', 'eee50774086309c', 'Spawn1'),

    W3N7Harvester1: role.harvester('eee50774086309c', 'Spawn3'),
    W3N7Upgrader1: role.upgrader('eee50774086309c', 'Spawn3'),

    WIN7Supporter4: role.supporter('W3N8', 'ebdd0774017409d', 'Spawn1'),
    WIN7RemoteUpgrader3: role.remoteUpgrader('W3N8', 'ebdd0774017409d', 'Spawn1'),

    W3N8Harvester1: role.harvester('ebdd0774017409d', 'Spawn4'),
    W3N8Upgrader1: role.upgrader('ebdd0774017409d', 'Spawn4'),
}

// creep 的默认内存
export const creepDefaultMemory: CreepMemory = {
    role: '',
    working: false,
    hasSendRebirth: false
}