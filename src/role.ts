import baseRoles from './roles.base'
import advancedRoles from './roles.advanced'
import remoteRoles from './roles.remote'
import warRoles from './roles.war'

export default {
    ...baseRoles,
    ...advancedRoles,
    ...warRoles,
    ...remoteRoles
}