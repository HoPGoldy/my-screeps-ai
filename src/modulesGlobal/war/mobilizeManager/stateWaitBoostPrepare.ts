import { BoostState } from "@/modulesRoom/lab/types";
import { getBodyBoostResource } from "@/role/bodyUtils";
import { SquadTypeName } from "../squadManager/types";
import { getBodyPart } from "./getBodyPart";
import { RunMobilizeStateFunc, MobilizeState } from "./types";

export const runWaitBoostPrepare: RunMobilizeStateFunc = function ({ task, room, updateState, abandonTask }, env) {
    console.log('正在执行 waitBoostPrepare')

    // 添加 boost 任务
    if (!task.data.boostTaskId) {
        const bodys = getBodyPart[task.squadType]()
        const boostResource = getBodyBoostResource(bodys)

        const allResourceEnough = boostResource.every(boostRes => {
            const { total } = room.myStorage.getResource(boostRes.resource)
            return total > boostRes.amount
        })

        /**
         * @todo lab 不足怎么办
         */

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
