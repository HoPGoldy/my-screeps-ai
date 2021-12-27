/**
 * 工作任务中相关的延迟任务
 */

import { DelayTaskData } from '@/modulesGlobal/delayQueue'
import { withDelayCallback } from '@/mount/global/delayQueue'
import { WORK_TASK_PRIOIRY } from './constant'
import { WorkTaskType } from './types'

interface BuildDelayTaskData {
    roomName: string
    need?: number
}

const delayAddBuildTask = withDelayCallback('addBuildTask', ({ roomName, need }: BuildDelayTaskData) => {
    const room = Game.rooms[roomName]
    // 如果没有工地的话就创建并再次发布建造任务
    if (!room) {
        delayAddBuildTask({ roomName }, 2)
        return
    }

    // 发布建筑
    room.work.updateTask({ type: WorkTaskType.Build, need, priority: WORK_TASK_PRIOIRY.BUILD }, { dispath: true })
})

/**
 * 添加工地建造任务
 * 因为工地在下个 tick 才能被发现，所以需要延迟任务
 *
 * @param roomName 建筑任务要发布到那个房间，默认为 pos 所在房间
 */
export const addBuildTask = (roomName: string, need?: number) => delayAddBuildTask({ roomName, need }, 2)

/**
 * 当墙刷到上限后，会每隔一段时间回来看看是不是有墙掉回来了
 * 在刷墙任务完成时发布
 */
export const delayAddFillWallTask = withDelayCallback('addFillWallTask', ({ roomName }: DelayTaskData) => {
    const room = Game.rooms[roomName]
    if (!room) return

    room.work.updateTask({ type: WorkTaskType.FillWall }, { dispath: true })
})
