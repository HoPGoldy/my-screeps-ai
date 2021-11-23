import { CreepRole } from '@/role/types/role'
import { WorkTaskType } from '../taskWork/types'
import RoomStrategyController from './controller'

/**
 * 运维策略
 * 包含房间在和平时期进行的 creep 和任务调度策略
 */
export class DefenseStrategy {
    controller: RoomStrategyController

    constructor (strategyController: RoomStrategyController) {
        this.controller = strategyController
    }

    /**
     * 所在房间快捷访问
     */
    get room () {
        return this.controller.room
    }

    /**
     * 将房间的运维角色配置调整为防御模式
     */
    useUnitSetting () {
        // 小于七级的话无法生成 defender，所以会孵化更多的 repairer
        const newWorkerNumber = this.room.controller.level >= 7 ? 3 : 8

        this.room.spawner.release.setBaseUnitLimit(CreepRole.Worker, { MIN: 1, MAX: newWorkerNumber })
        this.room.spawner.release.setBaseUnitLimit(CreepRole.Manager, { MIN: 2, MAX: 3 })

        // 提高刷墙任务优先级并孵化额外工作单位
        this.room.work.updateTask({ type: WorkTaskType.FillWall, priority: 9 })
        this.room.spawner.release.changeBaseUnit(CreepRole.Worker, newWorkerNumber)
    }
}
