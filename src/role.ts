import harvester from './role.harvester'
import upgrader from './role.upgrader'
import builder from './role.builder'
import repairer from './role.repairer'
import claimer from './role.claimer'
import soldier from './role.soldier'
import transfer from './role.transfer'
import remoteHarvester from './role.remoteHarvester'
import remoteBuilder from './role.remoteBuilder'
import remoteUpgrader from './role.remoteUpgrader'
import towerTransfer from './role.towerTransfer'

import baseRoles from './roles.base'
import remoteRoles from './roles.remote'

export default {
    ...baseRoles,
    // harvester,
    // upgrader,
    // builder,
    // repairer,
    // towerTransfer,

    soldier,

    ...remoteRoles,
    // claimer,
    // remoteBuilder,
    // remoteUpgrader,
    // remoteHarvester
}