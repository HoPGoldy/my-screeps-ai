import { ManagerState, TransportWorkContext } from '../types'
import { onDeathClear } from './workDeathClear'
import { onClearRemains } from './workClearRemains'
import { onGetResource } from './workGetResource'
import { onPutResource } from './workPutResource'

const stateRuners: { [state in ManagerState]: (context: TransportWorkContext) => void } = {
    // 快死之前清空自己身上携带的资源
    [ManagerState.DeathClear]: onDeathClear,
    // 清空身上的非任务资源，防止占用空间影响效率
    [ManagerState.ClearRemains]: onClearRemains,
    // 从指定目标获取资源
    [ManagerState.GetResource]: onGetResource,
    // 把资源存放到指定目标
    [ManagerState.PutResource]: onPutResource
}

export const runManager = function (context: TransportWorkContext) {
    const { managerData, taskData } = context
    // console.log('managerData', JSON.stringify(managerData))
    // console.log('taskData', JSON.stringify(taskData))
    if (!managerData.state) managerData.state = ManagerState.ClearRemains

    stateRuners[managerData.state](context)
}
