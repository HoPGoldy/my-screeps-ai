import harvester from './base/harvester'
import worker from './base/worker'
import manager from './base/manager'
import miner from './base/miner'
import defender from './base/defender'

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

import { CreepConfig, CreepRole } from './types/role'

/**
 * creep 工作逻辑集合
 * 包含了每个角色应该做的工作
 */
type CreepWork = {
    [Role in CreepRole]: CreepConfig<Role>
}

const creepWork: CreepWork = {
    /**
     * 房间运维角色组
     * 包括了维持房间正常运行所需的单位
     */
    harvester,
    worker,
    manager,
    miner,
    defender,

    /**
     * 外派角色组
     * 本角色组包括了多房间拓展所需要的角色
     */
    claimer,
    depositHarvester,
    moveTester,
    pbAttacker,
    pbCarrier,
    pbHealer,
    reiver,
    remoteBuilder,
    remoteHarvester,
    remoteUpgrader,
    reserver,
    signer
}

/**
 * 导出所有的角色
 */
export default creepWork
