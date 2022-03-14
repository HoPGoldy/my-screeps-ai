import { DEFAULT_UNIT_LIMIT } from '../constants'
import { DefaultTaskUnitMemory, TaskBaseContext } from '../types'
import { UnitFireControl } from './useUnitFire'

/**
 * 用于控制单位的数量增加或减少
 */
export const useUnitNumberAdjust = function (
    fireControl: UnitFireControl,
    getUnitMemorys: () => Record<string, DefaultTaskUnitMemory>,
    context: TaskBaseContext
) {
    const { getMemory, releaseUnit, roleName, roomName, env } = context
    const { fireCreep, unfireCreep, haveCreepBeenFired } = fireControl

    /**
     * 变更运维单位数量
     *
     * @param adjust 要增减的数量，为负代表减少
     */
    const changeUnitNumber = function (adjust: number): void {
        const memory = getMemory()
        // 获取对应的最大数量和最小数量
        const { unitMin = DEFAULT_UNIT_LIMIT.min, unitMax = DEFAULT_UNIT_LIMIT.max } = memory

        // 找到所有本房间的单位
        const allUnitInfos = getUnitMemorys()
        const allUnitNames = Object.keys(allUnitInfos)

        // 计算真实的调整数量
        const realAdjust = clacRealAdjust(adjust, allUnitNames.length, unitMin, unitMax)
        // console.log('真实调整', roleName, adjust, realAdjust)

        const removeWhenDiedCreep: string[] = []
        const keepWhenDiedCreep: string[] = []
        const newSpawnCreep: string[] = []

        // 要增加单位
        if (realAdjust >= 0) {
            let remainingAdjust = realAdjust

            // 首先遍历所有活着的单位，如果被炒鱿鱼了就解除炒鱿鱼
            for (const creepName in allUnitInfos) {
                if (remainingAdjust <= 0) break
                if (!haveCreepBeenFired(creepName)) continue

                unfireCreep(creepName)
                keepWhenDiedCreep.push(creepName)
                remainingAdjust -= 1
            }

            // 为新孵化的单位找到名字
            for (let i = 0; remainingAdjust > 0; i++) {
                const newUnitName = roomName + roleName + i
                if (newUnitName in allUnitInfos) continue

                newSpawnCreep.push(newUnitName)
                remainingAdjust -= 1
            }

            // 用对应的名字发布 creep
            newSpawnCreep.forEach(releaseUnit)
        }
        // 要减少单位
        else {
            // 从末尾开始炒鱿鱼，注意这里的 realAdjust 是负数，所以应该用 +
            // 这里没有事先剔除掉被炒鱿鱼的单位，因为此时被炒鱿鱼的单位还在工作
            // 所以工作模块给出的期望实际上是包括这些单位在内的，如果此时将其剔除掉之后再进行炒鱿鱼的话，就会炒掉过多的人
            const fireCreeps = allUnitNames.slice(allUnitNames.length + realAdjust)
            fireCreeps.forEach(fireCreep)
            fireCreeps.forEach(creepName => removeWhenDiedCreep.push(creepName))
        }

        if (realAdjust !== 0) {
            let logContent = `${roomName} ${roleName} ${realAdjust > 0 ? '+' : ''}${realAdjust} ` +
                `[上/下限] ${unitMax}/${unitMin} [当前数量] ${allUnitNames.length} [调整]`

            if (removeWhenDiedCreep.length > 0) logContent += ` 将在死亡后移除 ${removeWhenDiedCreep.join(',')}`
            if (keepWhenDiedCreep.length > 0) logContent += ` 将在死亡后继续孵化 ${keepWhenDiedCreep.join(',')}`
            if (newSpawnCreep.length > 0) logContent += ` 新孵化 ${newSpawnCreep.join(',')}`

            env.log.success(logContent)
        }
    }

    /**
     * 获取实际调整数量
     * 保证最少有 MIN 人，最多有 MAX 人
     *
     * @param expect 期望的调整数量
     * @param old 调整之前的数量
     * @param min 最少数量
     * @param max 最多数量
     */
    const clacRealAdjust = function (expect: number, old: number, min: number, max: number): number {
        // 调整完的人数超过限制了，就增加到最大值
        if (old + expect > max) return max - old
        // 调整完了人数在正常区间，直接用
        else if (old + expect >= min) return expect
        // 调整值导致人数不够了，根据最小值调整
        else return min - old
    }

    /**
     * 设置运维单位数量上下限
     *
     * @param limit 设置的限制，设置为空来使用默认配置
     */
    const setUnitLimit = function (limit?: { max?: number, min?: number }): void {
        const memory = getMemory()
        if (!limit) {
            delete memory.unitMax
            delete memory.unitMin
            return
        }

        const { unitMin: min, unitMax: max } = memory
        const newLimit = {
            ...DEFAULT_UNIT_LIMIT,
            min, max,
            ...limit
        }

        // 把新配置覆写保存进内存
        memory.unitMax = newLimit.max
        memory.unitMin = newLimit.min
    }

    return { setUnitLimit, changeUnitNumber }
}
