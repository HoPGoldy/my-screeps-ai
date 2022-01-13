/**
 * 计算身体孵化要消耗的能量
 *
 * @param bodys 要计算的身体数组
 * @returns 孵化要消耗的数量
 */
export const getBodySpawnEnergy = function (bodys: BodyPartConstant[]): number {
    return bodys.reduce((cost, body) => cost + BODYPART_COST[body], 0)
}

/**
 * 根据身体配置生成完成的身体数组
 *
 * @param bodySet 身体部件配置对象
 */
export const calcBodyPart = function (bodySets: BodyRepeat[]): BodyPartConstant[] {
    // 把身体配置项拓展成如下形式的二维数组
    // [ [ TOUGH ], [ WORK, WORK ], [ MOVE, MOVE, MOVE ] ]
    const bodys = bodySets.map(([bodyPart, length]) => Array(length).fill(bodyPart))
    // 把二维数组展平
    return [].concat(...bodys)
}

/**
 * 从索引到身体常量的映射
 * 解压身体数组时使用
 */
const keyToPart = {
    A: ATTACK,
    M: MOVE,
    W: WORK,
    C: CARRY,
    R: RANGED_ATTACK,
    T: TOUGH,
    H: HEAL,
    L: CLAIM
}

/**
 * 从身体常量到索引的映射（就是把上面 keyToPart 的 key value 互换一下）
 * 压缩身体数组时使用
 */
const partToKey = Object.entries(keyToPart).reduce((result, [key, part]) => {
    result[part] = key
    return result
}, {})

/**
 * 压缩过的身体数组
 * 实际类型为字符串
 */
export type BodyString = string & Tag.OpaqueTag<BodyPartConstant[]>;

/**
 * 将身体数组压缩为字符串
 * 注意，压缩后的数字 + 1 才是实际的身体部件数量
 */
export const serializeBody = function (bodyParts: BodyPartConstant[]): BodyString {
    let repeatCount = 0
    const resultStr = bodyParts.reduce((result, part) => {
        const partKey = partToKey[part]
        if (result[result.length - 1] === partKey) repeatCount++
        else {
            if (repeatCount) result += repeatCount
            result += partKey
            repeatCount = 0
        }

        return result
    }, '')

    return (repeatCount ? resultStr + repeatCount : resultStr) as BodyString
}

/**
 * 将压缩的身体字符串还原为身体数组
 */
export const unserializeBody = function (bodyStr: BodyString): BodyPartConstant[] {
    // 分割字符串，例如 a5m1wa3 分割为 ['a', '5', 'm', '1', 'w', 'a', '3']
    const keys = bodyStr.match(/[a-z]|\d+/gi)
    let result: BodyPartConstant[] = []
    do {
        const key = keys.shift()
        if (!(key in keyToPart)) continue

        const part: BodyPartConstant = keyToPart[key]
        // 下一个是身体部件
        if (keys[0] in keyToPart) result.push(part)
        // 下一个是数字，把本身体重复对应次数
        else result = result.concat(Array(Number(keys.shift()) + 1).fill(part))
    } while (keys.length > 0)

    return result
}

/**
 * 简写版本的 bodyPart[]，格式如下：
 * @example [[TOUGH, 3], [WORK, 4], [MOVE, 7]]
 */
export type BodyRepeat = [BodyPartConstant, number]

/**
 * 计算身体部件需要的强化资源数量
 *
 * @param bodys 要强化的身体部件数组
 * @param boostConfig 身体部件强化所使用的资源
 */
export const getBodyBoostResource = function (
    bodys: BodyPartConstant[],
    boostConfig: { [bodyType in BodyPartConstant]?: MineralBoostConstant }
): BoostResourceConfig[] {
    const boostAmounts: { [type in MineralBoostConstant]?: number } = {}

    bodys.forEach(body => {
        if (!(body in boostConfig)) return
        boostAmounts[boostConfig[body]] = (boostAmounts[boostConfig[body]] || 0) + LAB_BOOST_MINERAL
    })

    return Object.entries(boostAmounts).map(([res, amount]) => ({
        resource: res as MineralBoostConstant,
        amount
    }))
}

/**
 * 强化任务的材料清单
 */
export interface BoostResourceConfig {
    /**
     * 强化材料类型
     */
    resource: MineralBoostConstant
    /**
     * 强化材料数量
     */
    amount: number
}
