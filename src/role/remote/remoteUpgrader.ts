import { bodyConfigs } from '../bodyConfigs'
import { createBodyGetter } from 'utils'
import { remoteHelperIsNeed } from './utils'

/**
 * 支援 - 采矿者
 * 拓展型建造者, 会先抵达指定房间, 然后执行建造者逻辑
 */
const remoteUpgrader: CreepConfigGenerator<'remoteUpgrader'> = data => ({
    isNeed: room => {
        const target = Game.rooms[data.targetRoomName]
        // 目标房间到 6 了就算任务完成
        return remoteHelperIsNeed(room, target, () =>  target.controller.level >= 6)
    },
    // 向指定房间移动
    prepare: creep => {
        // 只要进入房间则准备结束
        if (creep.room.name !== data.targetRoomName) {
            creep.goTo(new RoomPosition(25, 25, data.targetRoomName))
            return false
        }
        else {
            delete creep.memory._go
            return true
        }
    },
    // 下面是正常的升级者逻辑
    source: creep => {
        if (creep.store.getFreeCapacity(RESOURCE_ENERGY) === 0) return true

        // 获取有效的能量来源
        let source: AllEnergySource
        if (!creep.memory.sourceId) {
            source = creep.room.getAvailableSource()
            if (!source) {
                creep.say('没能量了，歇会')
                return false
            }

            creep.memory.sourceId = source.id
        }
        else source = Game.getObjectById(creep.memory.sourceId)
        // 之前的来源建筑里能量不够了就更新来源
        if (
            !source ||
            (source instanceof Structure && source.store[RESOURCE_ENERGY] < 300) ||
            (source instanceof Source && source.energy === 0)
        ) delete creep.memory.sourceId

        creep.getEngryFrom(source)
    },
    target: creep => {
        creep.upgrade()
        if (creep.store.getUsedCapacity() === 0) return true
    },
    bodys: createBodyGetter(bodyConfigs.worker)
})

export default remoteUpgrader