// 从角色名到角色工作逻辑的映射,
// 添加新角色只需要在这里添加对应关系即可
const roleMap = {
    worker: require('role.worker'),
    harvester: require('role.harvester'),
    upgrader: require('role.upgrader'),
    builder: require('role.builder'),
    transfer: require('role.transfer'),
    repairer: require('role.repairer'),
    defender: require('role.defender'),
    soldier: require('role.soldier'),
    claimer: require('role.claimer'),
}

/**
 * 根据角色名执行对应的 run 方法
 * 没有找到则默认执行 worker 的工作
 * 
 * @param {object} creep
 * @param {string} roleName 角色名称
 */
module.exports = (creep, roleName) => {
    (roleName in roleMap) ? 
        roleMap[roleName].run(creep) :
        roleMap['worker'].run(creep)
}