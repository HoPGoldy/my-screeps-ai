import baseRoles from './roles.base'
import remoteRoles from './roles.remote'
import warRoles from './roles.war'

export default {
    ...baseRoles,
    ...warRoles,
    ...remoteRoles
}