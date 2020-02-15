import baseRoles from './roles.base'
import advancedRoles from './roles.advanced'
import remoteRoles from './roles.remote'
import warRoles from './roles.war'

const creepWork: CreepWork = {
    ...baseRoles,
    ...advancedRoles,
    ...warRoles,
    ...remoteRoles
}
/**
 * 导出所有的角色
 */
export default creepWork