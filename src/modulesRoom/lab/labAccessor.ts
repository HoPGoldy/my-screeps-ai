import { LabMemoryAccessor } from './memory'
import { LabContext, LabType } from './types'

interface LabInfo {
    type: LabType
}

export const createLabAccessor = function (roomName: string, context: LabContext, db: LabMemoryAccessor) {
    const { getLab, getMemory, env } = context
    const labInfos = new Map<Id<StructureLab>, LabInfo>()

    /**
     * 根据当前房间情况重新设置 lab 状态信息
     */
    const initLabInfo = function () {
        const room = env.getRoomByName(roomName)
        if (!room) {
            env.log.error(`${roomName} 无法访问，lab 访问器初始化失败`)
            return
        }
        const memory = getMemory(room)

        // 所有 lab 都默认为反应 lab
        getLab(room).map(lab => lab.id)
            .forEach(id => labInfos.set(id, { type: LabType.Reaction }))

        // 设置 boost lab
        if (memory.boostTasks) {
            memory.boostTasks.forEach(({ res }) => {
                res.forEach(({ lab }) => labInfos.set(lab, { type: LabType.Boost }))
            })
        }

        // 设置 inLab，如果 inLab 参加强化了就先保持原样
        if (memory.inLab) {
            memory.inLab.forEach(id => {
                const inLabInfo = labInfos.get(id)
                // 如果出现了 lab 找不到，则有可能被拆了，暂停运行
                if (!inLabInfo) {
                    env.log.error(`${roomName} 找不到 lab [${id}]，集群已暂停运行`)
                    return db.pauseLab()
                }
                if (inLabInfo.type !== LabType.Boost) inLabInfo.type = LabType.Base
            })
        }
    }

    // 全局重置时默认进行一次初始化
    initLabInfo()

    /**
     * 根据类型获取 lab
     */
    const getLabByType = function (labType: LabType): StructureLab[] {
        return [...labInfos]
            .filter(([id, { type }]) => type === labType)
            .map(([id]) => Game.getObjectById(id))
    }

    /**
     * 获取底物存放 lab
     */
    const getInLabs = function () {
        return getLabByType(LabType.Base)
    }

    /**
     * 获取正在参与反应的 lab
     * 注意！这些 lab 中**不包含** inLab
     */
    const getReactionLabs = function () {
        return getLabByType(LabType.Reaction)
    }

    /**
     * 获取正在执行强化任务的 lab
     */
    const getBoostLabs = function () {
        return getLabByType(LabType.Boost)
    }

    /**
     * 切换 lab 的状态
     * @param id 要更新类型的 lab id
     * @param toType 更新到的类型
     */
    const changeLabType = function (id: Id<StructureLab>, toType: LabType.Boost | LabType.Reaction) {
        const info = labInfos.get(id)
        if (!info) return
        info.type = toType
    }

    return { getInLabs, getBoostLabs, getReactionLabs, initLabInfo, changeLabType }
}

export type LabAccessor = ReturnType<typeof createLabAccessor>
