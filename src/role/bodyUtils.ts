/**
 * 包含可复用的 creep 角色身体配置项
 */

import { BoostResourceConfig } from '@/modulesRoom/lab/types'
import { SepicalBodyType } from '@/modulesRoom/taskWork/types'
import { BodyConfig, BodyConfigs, BodyPartGenerator, BodyRepeat } from './types/body'

/**
 * 根据身体配置生成完成的身体数组
 * cpu 消耗: 0.028 左右
 * 
 * @param bodySet 身体部件配置对象
 */
export function calcBodyPart(bodySets: BodyRepeat[]): BodyPartConstant[] {
    // 把身体配置项拓展成如下形式的二维数组
    // [ [ TOUGH ], [ WORK, WORK ], [ MOVE, MOVE, MOVE ] ]
    const bodys = bodySets.map(([ bodyPart, length ]) => Array(length).fill(bodyPart))
    // 把二维数组展平
    return [].concat(...bodys)
}

/**
 * body 和要使用的强化材料
 * 目前只会使用 t3 材料
 */
export const BODY_BOOST_RESOURCES = {
    [WORK]: RESOURCE_CATALYZED_ZYNTHIUM_ACID,
    [ATTACK]: RESOURCE_CATALYZED_UTRIUM_ACID,
    [RANGED_ATTACK]: RESOURCE_CATALYZED_KEANIUM_ALKALIDE,
    [HEAL]: RESOURCE_CATALYZED_LEMERGIUM_ALKALIDE,
    [MOVE]: RESOURCE_CATALYZED_ZYNTHIUM_ALKALIDE,
    [TOUGH]: RESOURCE_CATALYZED_GHODIUM_ALKALIDE
}

/**
 * 计算身体部件需要的强化资源数量
 */
export const getBodyBoostResource = function (bodys: BodyPartConstant[]): BoostResourceConfig[] {
    const boostAmounts: { [type in MineralBoostConstant]?: number } = {}
    bodys.forEach(body => {
        boostAmounts[BODY_BOOST_RESOURCES[body]] =
            (boostAmounts[BODY_BOOST_RESOURCES[body]] || 0) + LAB_BOOST_MINERAL
    })

    return Object.entries(boostAmounts).map(([res, amount]) => ({
        resource: res as MineralBoostConstant,
        amount
    }))
}

/**
 * 生成通用身体部件获取函数
 * 
 * @param bodyConfig 该 creep 对应的身体配置项
 */
export function createBodyGetter(bodyConfig: BodyConfig): BodyPartGenerator {
    /**
     * 获取身体部件数组
     * 根据房间中现存的能量选择给定好的体型
     */
    return function(room: Room, spawn: StructureSpawn): BodyPartConstant[] {
        const targetLevel = Object.keys(bodyConfig).reverse().find(level => {
            // 先通过等级粗略判断，再加上 dryRun 精确验证
            const availableEnergyCheck = (Number(level) <= room.energyAvailable)
            const dryCheck = (spawn.spawnCreep(bodyConfig[level], 'bodyTester', { dryRun: true }) == OK)

            return availableEnergyCheck && dryCheck
        })
        if (!targetLevel) return [ ]

        // 获取身体部件
        const bodys: BodyPartConstant[] = bodyConfig[targetLevel]

        return bodys
    }
}

/**
 * 快速生成 creep 身体部件配置项
 * 
 * @param bodySets 1 - 8 级时对应的身体部件配置
 */
const getBodyConfig = function(...bodySets: [
    BodyRepeat[], BodyRepeat[], BodyRepeat[], BodyRepeat[], BodyRepeat[], BodyRepeat[], BodyRepeat[], BodyRepeat[]
]): BodyConfig {
    const config = { 300: [], 550: [], 800: [], 1300: [], 1800: [], 2300: [], 5600: [], 10000: [] }
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
        [[WORK, 2], [CARRY, 1], [MOVE, 1]],
        [[WORK, 4], [CARRY, 1], [MOVE, 2]],
        [[WORK, 5], [CARRY, 1], [MOVE, 3]],
        [[WORK, 6], [CARRY, 1], [MOVE, 4]],
        [[WORK, 10], [CARRY, 1], [MOVE, 5]],
        [[WORK, 12], [CARRY, 1], [MOVE, 6]],
        [[WORK, 12], [CARRY, 1], [MOVE, 6]],
        [[WORK, 12], [CARRY, 1], [MOVE, 6]]
    ),

    /**
     * 工作单位
     */
    worker: getBodyConfig(
        [[WORK, 1], [CARRY, 1], [MOVE, 1]],
        [[WORK, 2], [CARRY, 2], [MOVE, 2]],
        [[WORK, 3], [CARRY, 3], [MOVE, 3]],
        [[WORK, 4], [CARRY, 4], [MOVE, 4]],
        [[WORK, 6], [CARRY, 6], [MOVE, 6]],
        [[WORK, 9], [CARRY, 9], [MOVE, 9]],
        [[WORK, 12], [CARRY, 6], [MOVE, 9]],
        [[WORK, 20], [CARRY, 8], [MOVE, 14]]
    ),

    /**
     * 房间物流管理单位
     * 负责转移基地资源的 creep
     */
    manager: getBodyConfig(
        [[CARRY, 2], [MOVE, 1]],
        [[CARRY, 3], [MOVE, 2]],
        [[CARRY, 4], [MOVE, 2]],
        [[CARRY, 5], [MOVE, 3]],
        [[CARRY, 8], [MOVE, 4]],
        [[CARRY, 14], [MOVE, 7]],
        [[CARRY, 20], [MOVE, 10]],
        [[CARRY, 32], [MOVE, 16]]
    ),

    /**
     * 外矿预定单位
     */
    reserver: getBodyConfig(
        [[MOVE, 1], [CLAIM, 1]],
        [[MOVE, 1], [CLAIM, 1]],
        [[MOVE, 1], [CLAIM, 1]],
        [[MOVE, 1], [CLAIM, 1]],
        [[MOVE, 2], [CLAIM, 2]],
        [[MOVE, 2], [CLAIM, 2]],
        [[MOVE, 3], [CLAIM, 3]],
        [[MOVE, 5], [CLAIM, 5]]
    ),

    /**
     * 外矿采集者
     * 和采集者的区别就是外矿采集者拥有更多的 CARRY
     */
    remoteHarvester: getBodyConfig(
        [[WORK, 1], [CARRY, 1], [MOVE, 1]],
        [[WORK, 2], [CARRY, 2], [MOVE, 2]],
        [[WORK, 3], [CARRY, 3], [MOVE, 3]],
        [[WORK, 4], [CARRY, 6], [MOVE, 5]],
        [[WORK, 5], [CARRY, 9], [MOVE, 7]],
        [[WORK, 6], [CARRY, 10], [MOVE, 8]],
        [[WORK, 7], [CARRY, 15], [MOVE, 11]],
        [[WORK, 11], [CARRY, 15], [MOVE, 19]]
    )
}

/**
 * 特殊的身体部件类型及其对应的身体部件数组
 */
export const specialBodyConfig: { [type in SepicalBodyType]: BodyPartGenerator } = {
    /**
     * RCL7 时的升级单位身体部件，由于是从 link 中取能量所以 CARRY 较少
     */
    upgrade7: () => calcBodyPart([[WORK, 30], [CARRY, 5], [MOVE, 15]]),
    /**
     * RCL8 时的升级单位身体部件，升级受限，所以 WORK 是 15 个
     */
    upgrade8: () => calcBodyPart([[WORK, 15], [CARRY, 6], [MOVE, 12]])
}
