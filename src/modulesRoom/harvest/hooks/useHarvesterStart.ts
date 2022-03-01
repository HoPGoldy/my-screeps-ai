import { serializePos, unserializePos } from '@/utils'
import { HarvestContext, HarvesterActionStrategy, HarvesterMemory } from '../types'

/**
 * 能量矿采集：启动模式
 *
 * 当房间内没有搬运工时，采集能量，填充 spawn 跟 extension
 * 当有搬运工时，无脑采集能量
 */
export const useHarvesterStart = function (context: HarvestContext): HarvesterActionStrategy {
    const {
        env, addConstructionSite, addBuildCotainerTask, getRoomTransportor, sourceUtils, getSpawn
    } = context

    /**
     * 移动到 source 旁丢弃能量的位置
     * @param creep 执行移动的单位
     */
    const goToDropPos = function (creep: Creep, source: Source, memory: HarvesterMemory): {
        // 本次移动的返回值
        result: ScreepsReturnCode
        // 移动的目的地（之前没有丢弃位置的话目标就为 source，否则为对应的能量丢弃位置）
        targetPos: RoomPosition
        // 要移动到的范围
        range: number
    } {
        let targetPos: RoomPosition
        let range = 0

        // 尝试从缓存里读位置
        if (memory.standPos) targetPos = unserializePos(memory.standPos)
        else {
            const { pos: droppedPos } = sourceUtils.getDroppedInfo(source)
            // 之前就已经有点位了，自己保存一份
            if (droppedPos) memory.standPos = serializePos(droppedPos)
            // 没有点位的话就要移动到 source，调整移动范围
            else range = 1

            targetPos = droppedPos || source.pos
        }

        // 到了就不进行移动了
        if (creep.pos.isEqualTo(targetPos)) return { result: OK, targetPos, range }

        // 执行移动
        const result = creep.goTo(targetPos, { range, checkTarget: false })
        return { result, targetPos, range }
    }

    return {
        prepare: (creep, source, memory) => {
            const { targetPos, range } = goToDropPos(creep, source, memory)

            // 没有抵达位置就准备未完成
            if (!creep.pos.inRangeTo(targetPos, range)) return false

            // 启动模式下，走到之后就将其设置为能量丢弃点
            sourceUtils.setDroppedPos(source, creep.pos)

            // 把该位置存缓存到自己内存
            memory.standPos = serializePos(creep.pos)

            // 找一下这个位置上有没有容器
            const getContainerFilter = s => s.structureType === STRUCTURE_CONTAINER
            const posContinaer = creep.pos.lookFor(LOOK_STRUCTURES).filter(getContainerFilter)
            console.log('harvester 查找容器的位置', JSON.stringify(creep.pos))
            const posContinaerSite = creep.pos.lookFor(LOOK_CONSTRUCTION_SITES).filter(getContainerFilter)

            if (posContinaer.length > 0 && posContinaerSite.length > 0) return true

            // 如果脚下没有 container 也没有工地的话就放工地并发布建造任务
            addConstructionSite(creep.pos, STRUCTURE_CONTAINER)
            addBuildCotainerTask(creep.room, source)
            env.log.success(`发布 source ${source.id} 的 container 建造任务`)
            return true
        },
        // 挖能量
        source: (creep, source, memory) => {
            // 如果有搬运工了就无脑采集
            if (
                creep.store.getFreeCapacity(RESOURCE_ENERGY) === 0 &&
                getRoomTransportor(source.room).length <= 0
            ) return true

            creep.harvest(source)
            goToDropPos(creep, source, memory)
        },
        // 把能量运到 spawn
        target: (creep, source, memory) => {
            // 有运输工了就回去挖能量
            if (creep.store[RESOURCE_ENERGY] <= 0 || getRoomTransportor(source.room).length > 0) return true

            const allSpawns = getSpawn(source.room)

            // 找到 spawn 然后把身上的能量全塞进去，不搜索 extension，因为启动时还没有 extension
            // 就算是重建，只要保证 spawn 里有能量也能孵化搬运工了
            const targetSpawn = allSpawns.find(spawn => {
                return spawn.store[RESOURCE_ENERGY] < SPAWN_ENERGY_CAPACITY
            }) || allSpawns[0]

            if (!targetSpawn) {
                creep.say('😨卧槽我家没了')
                return false
            }

            creep.goTo(targetSpawn.pos)
            creep.transfer(targetSpawn, RESOURCE_ENERGY)
        }
    }
}
