import baseRoles from './roles.base'
import advancedRoles from './roles.advanced'
import remoteRoles from './roles.remote'
import warRoles from './roles.war'

/**
 * 导出所有的角色
 */
export default {
    ...baseRoles,
    ...advancedRoles,
    ...warRoles,
    ...remoteRoles
}