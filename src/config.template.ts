import role from './role'


/**
 * creep 配置项 (重要)
 * 
 * 此列表标记了所有 creep 的信息和要执行的逻辑
 * creep 的日常升级也应通过修改该列表完成
 * [键名]: 该 creep 的角色(role)
 * [值]: 该 creep 的全部信息
 * 
 * 在新增完后可以手动执行全局的 reload 方法来将新增的 creep 添加到待生成队列
 * 而对 creep 逻辑的修改会直接生效
 */
export const creepConfigs: ICreepConfigs = {
    // 房间基本配置
    // E1harvester1: role.harvester('Spawn1', 'ef990774d80108c'), // 矿工
    // E1upgrader1: role.upgrader('Spawn1', 'ef990774d80108c'), // 升级者
    // E1builder1: role.builder('Spawn1', 'ba3c0774d80c3a8'), // 建筑工
    // E1repairer: role.repairer('Spawn1', 'ba3c0774d80c3a8'), // 维修者
    // E1TowerTransfer: role.towerTransfer('Spawn1', 'ba3c0774d80c3a8'), // 防御塔填充

    // 拓展组
    // W1N7Claimer: role.claimer('Spawn1'), // 占领者, 占领后及时注释, 不然会一直生成
    // WIN7RemoteBuilder: role.remoteBuilder('Spawn1', 'W1N8', 'ab9e0774d1c107c'), // 建筑工
    // WIN7RemoteUpgrader: role.remoteUpgrader('Spawn1', 'W1N8', 'ab9e0774d1c107c'), // 升级者
}