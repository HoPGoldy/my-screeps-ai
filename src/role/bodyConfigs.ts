/**
 * 包含可复用的 creep 角色身体配置项
 */

import { calcBodyPart, createBodyGetter } from '@/utils'

/**
 * 快速生成 creep 身体部件配置项
 * 
 * @param bodySets 1 - 8 级时对应的身体部件配置
 */
const getBodyConfig = function(...bodySets: [ BodySet, BodySet, BodySet, BodySet, BodySet, BodySet, BodySet, BodySet]): BodyConfig {
    let config = { 300: [], 550: [], 800: [], 1300: [], 1800: [], 2300: [], 5600: [], 10000: [] }
    // 遍历空配置项，用传入的 bodySet 依次生成配置项
    Object.keys(config).map((level, index) => {
        config[level] = calcBodyPart(bodySets[index])
    })

    return config
}

/**
 * 不同角色在 1 - 8 级时对应的的身体部件配置
 * spawn 在孵化时会根据所处房间的可用能量自动调整身体部件
 */
export const bodyConfigs: BodyConfigs = {
    harvester: getBodyConfig(
        { [WORK]: 2, [CARRY]: 1, [MOVE]: 1 },
        { [WORK]: 4, [CARRY]: 1, [MOVE]: 2 },
        { [WORK]: 6, [CARRY]: 1, [MOVE]: 3 },
        { [WORK]: 8, [CARRY]: 1, [MOVE]: 4 },
        { [WORK]: 10, [CARRY]: 1, [MOVE]: 5 },
        { [WORK]: 12, [CARRY]: 1, [MOVE]: 6 },
        { [WORK]: 12, [CARRY]: 1, [MOVE]: 6 },
        { [WORK]: 12, [CARRY]: 1, [MOVE]: 6 }
    ),

    /**
     * 工作单位
     */
    worker: getBodyConfig(
        { [WORK]: 1, [CARRY]: 1, [MOVE]: 1 },
        { [WORK]: 2, [CARRY]: 2, [MOVE]: 2 },
        { [WORK]: 3, [CARRY]: 3, [MOVE]: 3 },
        { [WORK]: 4, [CARRY]: 4, [MOVE]: 4 },
        { [WORK]: 6, [CARRY]: 6, [MOVE]: 6 },
        { [WORK]: 9, [CARRY]: 9, [MOVE]: 9 },
        { [WORK]: 12, [CARRY]: 6, [MOVE]: 9 },
        { [WORK]: 20, [CARRY]: 8, [MOVE]: 14 }
    ),

    /**
     * 房间物流管理单位
     * 负责转移基地资源的 creep
     */
    manager: getBodyConfig(
        { [CARRY]: 2, [MOVE]: 1 },
        { [CARRY]: 3, [MOVE]: 2 },
        { [CARRY]: 4, [MOVE]: 2 },
        { [CARRY]: 5, [MOVE]: 3 },
        { [CARRY]: 8, [MOVE]: 4 },
        { [CARRY]: 14, [MOVE]: 7 },
        { [CARRY]: 20, [MOVE]: 10 },
        { [CARRY]: 32, [MOVE]: 16 }
    ),

    /**
     * 中央物流管理单位
     * 负责转移中央物流的 creep（下面其实前 4 级都用不到，因为中央物流管理员只会在 5 级有了 centerLink 之后才会孵化）
     */
    processor: getBodyConfig(
        { [CARRY]: 2, [MOVE]: 1 },
        { [CARRY]: 3, [MOVE]: 1 },
        { [CARRY]: 5, [MOVE]: 1 },
        { [CARRY]: 7, [MOVE]: 1 },
        { [CARRY]: 11, [MOVE]: 1 },
        { [CARRY]: 14, [MOVE]: 1 },
        { [CARRY]: 26, [MOVE]: 1 },
        { [CARRY]: 39, [MOVE]: 1 }
    ),

    /**
     * 外矿预定单位
     */
    reserver: getBodyConfig(
        { [MOVE]: 1, [CLAIM]: 1 },
        { [MOVE]: 1, [CLAIM]: 1 },
        { [MOVE]: 1, [CLAIM]: 1 },
        { [MOVE]: 1, [CLAIM]: 1 },
        { [MOVE]: 2, [CLAIM]: 2 },
        { [MOVE]: 2, [CLAIM]: 2 },
        { [MOVE]: 3, [CLAIM]: 3 },
        { [MOVE]: 5, [CLAIM]: 5 }
    ),

    /**
     * 基础攻击单位
     * 使用 attack 身体部件的攻击单位
     */
    attacker: getBodyConfig(
        { [MOVE]: 2, [ATTACK]: 2 },
        { [MOVE]: 3, [ATTACK]: 3 },
        { [MOVE]: 4, [ATTACK]: 4 },
        { [MOVE]: 5, [ATTACK]: 5 },
        { [MOVE]: 6, [ATTACK]: 6 },
        { [MOVE]: 7, [ATTACK]: 7 },
        { [MOVE]: 8, [ATTACK]: 8 },
        { [MOVE]: 9, [ATTACK]: 9 }
    ),

    /**
     * 基础治疗单位
     */
    healer: getBodyConfig(
        { [MOVE]: 1, [HEAL]: 1 },
        { [MOVE]: 1, [HEAL]: 1 },
        { [MOVE]: 2, [HEAL]: 2 },
        { [MOVE]: 4, [HEAL]: 4 },
        { [MOVE]: 6, [HEAL]: 6 },
        { [MOVE]: 7, [HEAL]: 7 },
        { [MOVE]: 16, [HEAL]: 16 },
        { [MOVE]: 25, [HEAL]: 25 }
    ), 

    /**
     * 拆除者身体
     */
    dismantler: getBodyConfig(
        { [WORK]: 1, [MOVE]: 2 },
        { [WORK]: 2, [MOVE]: 4 },
        { [WORK]: 4, [MOVE]: 4 },
        { [WORK]: 6, [MOVE]: 6 },
        { [WORK]: 10, [MOVE]: 10 },
        { [WORK]: 15, [MOVE]: 15 },
        { [WORK]: 25, [MOVE]: 25 },
        { [WORK]: 25, [MOVE]: 25 }
    ),

    /**
     * 外矿采集者
     * 和采集者的区别就是外矿采集者拥有更多的 CARRY
     */
    remoteHarvester: getBodyConfig(
        { [WORK]: 1, [CARRY]: 1, [MOVE]: 1 },
        { [WORK]: 2, [CARRY]: 2, [MOVE]: 2 },
        { [WORK]: 3, [CARRY]: 3, [MOVE]: 3 },
        { [WORK]: 4, [CARRY]: 6, [MOVE]: 5 },
        { [WORK]: 5, [CARRY]: 9, [MOVE]: 7 },
        { [WORK]: 6, [CARRY]: 10, [MOVE]: 8 },
        { [WORK]: 7, [CARRY]: 15, [MOVE]: 11 },
        { [WORK]: 11, [CARRY]: 15, [MOVE]: 19 }
    )
}

/**
 * 特殊的身体部件类型及其对应的身体部件数组
 */
export const specialBodyConfig: { [type in SepicalBodyType]: BodyPartGenerator } = {
    /**
     * RCL7 时的升级单位身体部件，由于是从 link 中取能量所以 CARRY 较少
     */
    upgrade7: () => calcBodyPart({ [WORK]: 30, [CARRY]: 5, [MOVE]: 15 }),
    /**
     * RCL8 时的升级单位身体部件，升级受限，所以 WORK 是 15 个
     */
    upgrade8: () => calcBodyPart({ [WORK]: 15, [CARRY]: 6, [MOVE]: 12 })
}
