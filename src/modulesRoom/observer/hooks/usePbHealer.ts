import { createRole } from '@/modulesRoom/unitControl/controller'
import { calcBodyPart, createMemoryGetter } from '@/utils'
import { PbHarvestState } from '../constants'
import { ObserverContext, PbHealerMemory } from '../types'

export const getPbHealerName = (targetCreepName: string) => `${targetCreepName} healer`

/**
 * PowerBank 治疗单位
 * 移动并治疗 pbAttacker, 请在 8 级时生成
 */
export const usePbHealer = function (context: ObserverContext) {
    const { env, getMemory, pbHealerRole, addSpawnTask, addSpawnCallback, onCreepStageChange } = context

    const pbHealer = createRole<PbHealerMemory>({
        getMemory: createMemoryGetter(getMemory, 'pbHealer', {}),
        // healer 会一直生成，直到 attacker 通知移除
        onCreepDead: (creepName, memory, workRoom) => releasePbHealer(workRoom, memory.creepName),
        runTarget: (creep, memory) => {
            const targetCreep = env.getCreepByName(memory.creepName)
            if (!targetCreep) {
                creep.say('等等我对象')
                return false
            }

            // 移动到身边了就治疗
            if (creep.pos.isNearTo(targetCreep)) creep.heal(targetCreep)
            else creep.goTo(targetCreep.pos, { range: 1, checkTarget: false })
        },
        onCreepStageChange
    })

    const body = calcBodyPart([[HEAL, 25], [MOVE, 25]])

    /**
     * 发布 pb 治疗单位
     *
     * @param room 要孵化的房间
     * @param targetCreepName 要治疗的单位名字
     */
    const releasePbHealer = function (room: Room, targetCreepName: string) {
        const creepName = getPbHealerName(targetCreepName)
        addSpawnTask(room, creepName, pbHealerRole, body)
        pbHealer.registerUnit(creepName, { creepName: targetCreepName }, room)

        return creepName
    }

    addSpawnCallback(pbHealerRole, pbHealer.addUnit)

    return { pbHealer, releasePbHealer }
}

export type ReleasePbHealer = ReturnType<typeof usePbHealer>['releasePbHealer']

export type PbHealer = ReturnType<typeof usePbHealer>['pbHealer']
