import { DefaultTaskUnitMemory } from '../types'

/**
 * 单位开除相关方法
 * 为了减少孵化能量浪费，在决定减少运维单位数量时，被减少的单位不会被直接杀死
 * 而是会进入“开除”状态，开除状态下单位会继续正常工作直到老死，老死后则不再孵化
 * 若运维单位数量增加时有单位在开除状态中，将会直接接触开除状态，而不是孵化新的单位
 */
export const useUnitFire = function (getUnitMemorys: () => Record<string, DefaultTaskUnitMemory>) {
    /**
     * 开除某个 creep
     * 被开除的 creep 将会继续工作，直到死掉后将不再继续孵化
     */
    const fireCreep = function (creepName: string): void {
        const creepInfos = getUnitMemorys()
        if (creepName in creepInfos) creepInfos[creepName].fired = true
    }

    /**
     * 放弃开除某个 creep
     */
    const unfireCreep = function (creepName: string): void {
        const creepInfos = getUnitMemorys()
        if (creepName in creepInfos) delete creepInfos[creepName].fired
    }

    /**
     * 检查 creep 是否被炒鱿鱼了
     */
    const haveCreepBeenFired = function (creepName: string): boolean {
        const unitInfo = getUnitMemorys()[creepName]
        return !unitInfo || unitInfo.fired
    }

    return { fireCreep, unfireCreep, haveCreepBeenFired }
}

export type UnitFireControl = ReturnType<typeof useUnitFire>
