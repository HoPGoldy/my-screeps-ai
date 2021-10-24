import { BoostState } from "@/modulesRoom/lab/types";
import { getBodyBoostResource } from "@/role/bodyUtils";
import { SquadType } from "../squadManager/types";
import { getBodyPart } from "./getBodyPart";
import { RunMobilizeStateFunc, MobilizeState } from "./types";

export const runWaitBoostPrepare: RunMobilizeStateFunc = function (task, room, updateState) {
    console.log('正在执行 waitBoostPrepare')

    // 添加 boost 任务
    if (!task.data.boostTaskId) {
        const bodys = getBodyPart[task.squadType]()
        const boostResource = getBodyBoostResource(bodys)

        task.data.boostTaskId = room.myLab.addBoostTask(boostResource)
        return
    }

    // 检查 boost 任务是否准备就绪
    const boostTaskState = room.myLab.getBoostState(task.data.boostTaskId)
    if (boostTaskState === ERR_NOT_FOUND) return delete task.data.boostTaskId
    if (boostTaskState === BoostState.WaitBoost) updateState(MobilizeState.WaitSpawnEnergyPrepare)
}
