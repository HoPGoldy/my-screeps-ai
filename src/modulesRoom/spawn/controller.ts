import { createCache, unserializeBody } from '@/utils'
import { useSpawnCallback } from './hooks/useSpawnCallback'
import { createMemoryAccessor } from './memory'
import { SpawnContext } from './types'

export const createSpawnController = function (context: SpawnContext) {
    const { getMemory, env, getSpawn, requestFill, requestPowerExtension, importantRoles = [] } = context
    const { runSpawnCallback, addSpawnCallback } = useSpawnCallback()

    const lazyLoader = function (roomName: string) {
        const db = createMemoryAccessor(() => getMemory(env.getRoomByName(roomName)))

        const runSpawn = function (spawn: StructureSpawn) {
            const task = db.queryCurrentTask()
            if (!task) return
            const { bodys, name, data = {}, role } = task
            const memory = { ...data, role }

            const bodyParts = unserializeBody(bodys)
            const spawnResult = spawn.spawnCreep(bodyParts, name, { memory })

            // 检查是否生成成功
            if (spawnResult === OK) {
                db.deleteCurrentTask()
            }
            else if (spawnResult === ERR_NAME_EXISTS) {
                env.log.normal(`${name} 已经存在 ${this.roomName} 将不再生成`)
                db.deleteCurrentTask()
            }
            // 能量不足就挂起任务，但是如果是重要角色的话就会卡住然后优先孵化
            else if (
                spawnResult === ERR_NOT_ENOUGH_ENERGY &&
                !importantRoles.includes(role)
            ) db.hangTask()
            else {
                env.log.error(`生成失败, ${roomName} 任务 ${role} 挂起, 错误码 ${spawnResult}`)
                return spawnResult
            }
        }

        /**
         * 外借 spawn
         * 借出之后 spawn 将不会执行任何工作，完全交给对方模块
         * 借 spawn 的模块需要做好房间运维能力的检查，如果填能量的单位死掉了可以先归还 spawn，待孵化完成后再借走。
         */
        const lendSpawn = function (): boolean {
            const memory = getMemory(env.getRoomByName(roomName))
            if (memory.lendSpawn) return false
            memory.lendSpawn = true
            return true
        }

        /**
         * 归还 spawn
         * 借出之后可以通过该方法归还之前借出的 spawn
         */
        const remandSpawn = function (): void {
            const memory = getMemory(env.getRoomByName(roomName))
            delete memory.lendSpawn
        }

        /**
         * 检查当前的孵化中单位
         * 若出现孵化好的就触发回调
         */
        const checkSpawning = function (spawning: Record<string, true>) {
            if (!spawning) return
            Object.keys(spawning).forEach(creepName => {
                const creep = env.getCreepByName(creepName)
                // 爬没了，直接清掉
                if (!creep) {
                    db.deleteSpawning(creepName)
                    return
                }

                // 还在孵化，不管
                if (creep.spawning) return

                // 孵化好了，从列表中移除并拉起回调
                db.deleteSpawning(creepName)
                runSpawnCallback(creep.memory.role, creep)
            })
        }

        const run = function () {
            const room = env.getRoomByName(roomName)
            const memory = getMemory(room)

            // spawn 被外借了，直接跳过工作
            if (memory.lendSpawn) return
            checkSpawning(memory.spawning)

            const roomSpawn = getSpawn(room)

            /**
             * 找一个空闲的 spawn 执行工作
             * 注意，这里导致了相同房间每 tick 只会有一个 spawn 进行孵化
             * 这么设置的原因是，spawn 返回 OK 后 room.energyAvailable 并不会减少（要到下个 tick 真正开始孵化后才会减少）
             * 所以如果有三个孵化任务，每个任务都消耗 500 能量，而房间总共能量恰好是 500 点，
             * 就会出现三个孵化任务都返回 OK，但是下个 tick 只会有一个任务被实际孵化的问题。
             */
            let freeSpawn: StructureSpawn
            roomSpawn.forEach(spawn => {
                if (!spawn.spawning) {
                    freeSpawn = spawn
                    return
                }
                // 将该 creep 更新到孵化中队列，每个孵化 tick 都会更新一次，增强可靠性
                db.updateSpawning(spawn.spawning.name)

                /**
                 * 开始孵化后向物流队列推送能量填充任务
                 *
                 * 不在 mySpawnCreep 返回 OK 时判断是因为：
                 * 由于孵化是在 tick 末的行动执行阶段进行的，所以能量在下个 tick 才会从 extension 中扣除
                 * 如果返回 OK 就推送任务的话，就会出现任务已经存在了，而 extension 还是满的
                 * 而 creep 如果恰好此时里执行物流任务，就会发现能量一点没掉啊（下个 tick 能量才会掉）
                 * 然后就导致了发布了填充任务，但是立刻被物流单位移除，从而没人来填能量的问题
                 */
                if (spawn.spawning.needTime - spawn.spawning.remainingTime === 1) {
                    requestFill(room)
                    requestPowerExtension && requestPowerExtension(room)
                }
            })

            // 没有孵化任务或者没有空闲 spawn，不干活了
            if (!freeSpawn || !memory.spawnList || memory.spawnList.length <= 0) return
            runSpawn(freeSpawn)
        }

        return {
            run, lendSpawn, remandSpawn,
            getTaskByRole: db.queryTaskByRole,
            addTask: db.addTask,
            hasTask: db.hasTask,
            clear: db.deleteAllTask
        }
    }

    const [getSpawnController] = createCache(lazyLoader)
    return { getSpawnController, addSpawnCallback }
}

export type SpawnController = ReturnType<ReturnType<typeof createSpawnController>['getSpawnController']>
