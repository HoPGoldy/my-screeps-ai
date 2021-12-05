/**
 * 工作任务中相关的延迟任务
 */

import { withDelayCallback } from '@/mount/global/delayQueue'
import { WORK_TASK_PRIOIRY } from './constant'
import { WorkTaskType } from './types'

interface DelayTaskData {
    roomName: string
    need?: number
}

const delayAddBuildTask = withDelayCallback('addBuildTask', ({ roomName, need }: DelayTaskData) => {
    const room = Game.rooms[roomName]
    // 如果没有工地的话就创建并再次发布建造任务
    if (!room) {
        delayAddBuildTask({ roomName }, 2)
        return
    }

    // 以指定工地为目标发布建筑
    room.work.updateTask({ type: WorkTaskType.Build, need, priority: WORK_TASK_PRIOIRY.BUILD }, { dispath: true })
})

/**
 * 添加工地建造任务
 * 因为工地在下个 tick 才能被发现，所以需要延迟任务
 *
 * @param roomName 建筑任务要发布到那个房间，默认为 pos 所在房间
 */
export const addBuildTask = (roomName: string, need?: number) => delayAddBuildTask({ roomName, need }, 2)
