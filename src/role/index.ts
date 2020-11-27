import harvester from './base/harvester'
import collector from './base/collector'
import builder from './base/builder'
import filler from './base/filler'
import miner from './base/miner'
import repairer from './base/repairer'
import upgrader from './base/upgrader'

import manager from './advanced/manager'
import processor from './advanced/processor'

import claimer from './remote/claimer'
import depositHarvester from './remote/depositHarvester'
import moveTester from './remote/moveTester'
import pbAttacker from './remote/pbAttacker'
import pbCarrier from './remote/pbCarrier'
import pbHealer from './remote/pbHealer'
import reiver from './remote/reiver'
import remoteBuilder from './remote/remoteBuilder'
import remoteHarvester from './remote/remoteHarvester'
import remoteUpgrader from './remote/remoteUpgrader'
import reserver from './remote/reserver'
import signer from './remote/signer'

import apocalypse from './war/apocalypse'
import boostDismantler from './war/boostDismantler'
import boostDoctor from './war/boostDoctor'
import defender from './war/defender'
import dismantler from './war/dismantler'
import doctor from './war/doctor'
import soldier from './war/soldier'

const creepWork: CreepWork = {
    /**
     * 初级房间运维角色组
     * 包括了在没有 Storage 和 Link 的房间内运维所需的角色
     */
    harvester, collector, builder, filler, miner, repairer, upgrader,

    /**
     * 高级房间运营角色组
     * 本角色组包括了有 Storage 和 Link 的房间内运维所需的角色
     */
    manager, processor,

    /**
     * 外派角色组
     * 本角色组包括了多房间拓展所需要的角色
     */
    claimer, depositHarvester, moveTester, pbAttacker, pbCarrier, pbHealer, reiver, remoteBuilder, remoteHarvester, remoteUpgrader,
    reserver, signer,

    /**
     * 战斗角色组
     * 本角色组包括了对外战斗和房间防御所需要的角色
     */
    apocalypse, boostDismantler, boostDoctor, defender, dismantler, doctor, soldier
}

/**
 * 导出所有的角色
 */
export default creepWork