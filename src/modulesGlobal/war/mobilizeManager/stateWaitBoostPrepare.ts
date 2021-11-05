import { BoostState } from "@/modulesRoom/lab/types";
import { getBodyBoostResource } from "@/role/bodyUtils";
import { createSpawnInfo } from "./getBodyPart";
import { RunMobilizeStateFunc, MobilizeState } from "./types";

/**
 * 等待强化材料就绪阶段
 */
export const runWaitBoostPrepare: RunMobilizeStateFunc = function ({ task, room, updateState, abandonTask }, env) {
    // console.log('正在执行 waitBoostPrepare')

    // 添加 boost 任务
    if (!task.data.boostTaskId) {
        // 创建待孵化 creep 的名字与身体部件
        if (!task.data.spawnInfo) {
            task.data.spawnInfo = createSpawnInfo(room, task.squadCode, task.squadType)
        }

        const allBody: BodyPartConstant[] = [].concat(...Object.values(task.data.spawnInfo))
        const boostResource = getBodyBoostResource(allBody)

        const allResourceEnough = boostResource.every(boostRes => {
            const { total } = room.myStorage.getResource(boostRes.resource)
            return total > boostRes.amount
        })

        if (boostResource.length > room[STRUCTURE_LAB].length) {
            abandonTask(`所需 lab 数量不足，需要 ${boostResource.length} 现存 ${room[STRUCTURE_LAB].length}`)
            return
        }

        // boost 资源不足，将不会继续动员
        if (!allResourceEnough) {
            abandonTask('所需 boost 资源不足')
            return
        }

        task.data.boostTaskId = room.myLab.addBoostTask(boostResource)
        return
    }

    // 检查 boost 任务是否准备就绪
    const boostTaskState = room.myLab.getBoostState(task.data.boostTaskId)

    if (boostTaskState === ERR_NOT_FOUND) return delete task.data.boostTaskId
    if (boostTaskState === BoostState.WaitBoost) updateState(MobilizeState.Spawning)
}
