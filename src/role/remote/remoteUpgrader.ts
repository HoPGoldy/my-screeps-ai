import { bodyConfigs, createBodyGetter } from '../bodyUtils'
import { remoteHelperIsNeed } from './utils'
import { getRoomEnergyTarget } from '@/modulesGlobal/energyUtils'
import { CreepConfig, CreepRole } from '../types/role'
import { getSource } from '@/mount/room/shortcut'
import { sourceUtils } from '@/mount/global/source'

/**
 * 支援 - 采矿者
 * 拓展型建造者, 会先抵达指定房间, 然后执行建造者逻辑
 */
const remoteUpgrader: CreepConfig<CreepRole.RemoteUpgrader> = {
    isNeed: (room, preMemory) => {
        const target = Game.rooms[preMemory.data.targetRoomName]
        // 目标房间到 6 了就算任务完成
        return remoteHelperIsNeed(room, target, () => target.controller.level >= 6)
    },
    // 向指定房间移动
    prepare: creep => {
        const { targetRoomName } = creep.memory.data

        // 只要进入房间则准备结束
        if (creep.room.name !== targetRoomName) {
            creep.goTo(new RoomPosition(25, 25, targetRoomName), { checkTarget: false })
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
            source = getRoomEnergyTarget(creep.room)
            // 没有有效的能量来源建筑就去找能用的 source
            if (!source) {
                const sources = getSource(creep.room).filter(source => sourceUtils.canUse(source))
                source = creep.room.controller.pos.findClosestByPath(sources)
            }
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
        const { targetRoomName } = creep.memory.data
        creep.upgradeRoom(targetRoomName)
        if (creep.store.getUsedCapacity() === 0) return true
    },
    bodys: createBodyGetter(bodyConfigs.worker)
}

export default remoteUpgrader
