import { bodyConfigs } from '../bodyConfigs'
import { createBodyGetter } from 'utils'

/**
 * 掠夺者
 * 暂不支持从 ruin 中获取资源
 * 从指定房间的目标建筑（由旗帜指定）中搬运物品到指定建筑
 * 在目标建筑搬空后将会移除旗帜并自杀
 * 
 * data:
 * @param flagName 目标建筑上的旗帜名称
 * @param targetStructureId 要搬运到的建筑 id
 */
const reiver: CreepConfig<'reiver'> = {
    // 要搬运资源的目标旗帜消失了就不再生成
    isNeed: (room, preMemory) => preMemory.data.flagName in Game.flags, 
    // 如果已经统计了移动
    prepare: creep => {
        const { flagName } = creep.memory.data

        const flag = Game.flags[flagName]
        if (!flag) {
            creep.log(`未找到名为 ${flagName} 的旗帜，请在目标建筑上新建`)
            return false
        }

        // 如果路程已经统计完了就不再统计
        if (flag.memory.travelComplete && flag.memory.sourceId) return true
        // 进入房间了
        else if (flag.room) {
            if (!flag.memory.sourceId) {
                // 搜索包含存储的目标建筑并存储
                let targetStructure: StructureWithStore | Ruin = flag.pos.lookFor(LOOK_STRUCTURES).find(s => 'store' in s) as StructureWithStore
                
                if (!targetStructure) {
                    // 查找废墟，如果有包含 store 的废墟就设为目标
                    const ruins = flag.pos.lookFor(LOOK_RUINS)
                    for (const ruin of ruins) {
                        if ('store' in ruin && ruin.store.getUsedCapacity() > 0) {
                            targetStructure = ruin
                            break
                        }
                    }
                }

                if (targetStructure) {
                    flag.memory.sourceId = targetStructure.id
                }
                else creep.say('没找到建筑啊')
            }

            // 如果移动到附近了就准备完成
            if (creep.pos.isNearTo(flag)) {
                flag.memory.travelComplete = true
            }
        }

        // 移动并统计移动时长
        creep.goTo(flag.pos)
        flag.memory.travelTime = flag.memory.travelTime === undefined ? 0 : flag.memory.travelTime + 1
        return false
    },
    source: creep => {
        const { flagName } = creep.memory.data
        const flag = Game.flags[flagName]
        if (!flag) {
            creep.suicide()
            return false
        }

        if (flag.room) {
            const targetStructure = Game.getObjectById(flag.memory.sourceId as Id<StructureWithStore | Ruin>)
            // 如果对应的房间里没有找到目标建筑就自杀并移除旗帜
            if (!targetStructure) {
                delete Memory.flags[flagName]
                flag.remove()
                creep.suicide()
                return false
            }

            // 遍历目标建筑存储并找到可以拿取的资源
            for (const res in targetStructure.store) {
                if (targetStructure.store[res] > 0) {
                    // 如果有指定要搬运的资源，就看 res 是否是指定的资源之一，是则搬运，不是则检查下一个
                    if (Memory.reiveList && Memory.reiveList.length > 0) {
                        if (!Memory.reiveList.includes(res as ResourceConstant)) continue
                    }

                    const withdrawResult = creep.withdraw(targetStructure, res as ResourceConstant)

                    // 如果拿满了就执行 target
                    if (withdrawResult === ERR_FULL) return true
                    // 还没到就继续走
                    else if (withdrawResult === ERR_NOT_IN_RANGE) {
                        creep.goTo(targetStructure.pos)
                    }
                    
                    // 等到下个 tick 重新遍历来继续搬
                    return false
                }
            }

            // 上面的遍历完了就说明搬空了，移除旗帜并执行 target
            delete Memory.flags[flagName]
            flag.remove()
            return true
        }
        // 没有到指定房间就移动
        else creep.goTo(flag.pos)
        return false
    },
    target: creep => {
        const { targetId, flagName } = creep.memory.data
        const targetStructure = Game.getObjectById(targetId)
        if (!targetStructure) {
            creep.log(`找不到要存放资源的建筑 ${targetId}`, 'yellow')
            creep.say('搬到哪？')
            return false
        }

        if (creep.room.name === targetStructure.room.name) {
            // 遍历目标建筑存储并找到可以拿取的资源
            for (const res in creep.store) {
                if (creep.store[res] > 0) {
                    const result = creep.transfer(targetStructure, res as ResourceConstant)

                    // 还没到就继续走
                    if (result === ERR_NOT_IN_RANGE) creep.goTo(targetStructure.pos)
                    return false
                }
            }

            // 上面的遍历完了就说明放完了，检查生命值，如果还够搬一趟的就过去，否则自杀
            const flag = Game.flags[flagName] 
            if (!flag) {
                creep.suicide()
                return false
            }
            
            // 乘以 3 是去一趟，回来的时候走的慢需要两倍的时间再加上沼泽可能更慢，40 是冗余
            if (creep.ticksToLive >= flag.memory.travelTime * 3 + 40) return true
            else {
                creep.suicide()
                return false
            }
        }
        else creep.goTo(targetStructure.pos)
    },
    bodys: createBodyGetter(bodyConfigs.manager)
}

export default reiver