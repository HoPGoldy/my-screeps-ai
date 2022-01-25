import { PWR_ENABLE_ROOM } from '../constants'
import { PowerContext } from '../types'
import { MaintenanceContext } from './useMaintenance'

/**
 * 每种 power 所对应的的任务配置项
 * 状态机，执行逻辑类似于 creep 生命周期
 */
export interface PowerTaskConfig {
    /**
     * power 的资源获取逻辑
     *
     * @returns OK 任务完成，将会执行下面的 target 方法
     * @returns ERR_NOT_ENOUGH_RESOURCES 资源不足，将会强制切入 ops 生成任务
     * @returns ERR_BUSY 任务未完成，保留工作状态，后续继续执行
     */
    source?: (creep: PowerCreep) => OK | ERR_NOT_ENOUGH_RESOURCES | ERR_BUSY
    /**
     * power 的具体工作逻辑
     *
     * @returns OK 任务完成，将会继续检查后续 power
     * @returns ERR_NOT_ENOUGH_RESOURCES 资源不足，将会执行上面的 source 方法，如果没有 source 的话就强制切入 ops 生成任务
     * @returns ERR_BUSY 任务未完成，保留工作状态，后续继续执行
     */
    target: (creep: PowerCreep) => OK | ERR_NOT_ENOUGH_RESOURCES | ERR_BUSY
}

export const useTaskHandler = function (roomName: string, context: PowerContext, maintenance: MaintenanceContext) {
    const { env, getMemory, getResourceStructure, getFactory, getFactoryLevel, getSource, goTo } = context

    /**
     * 从房间存储中取出 ops 传递给指定 pc
     *
     * @param pc 该房间的运维 pc
     * @param opsNumber 要拿取的数量
     * @returns OK 拿取完成
     * @returns ERR_NOT_ENOUGH_RESOURCES 资源不足
     * @returns ERR_BUSY 正在执行任务
     */
    const getOps = function (pc: PowerCreep, opsNumber: number): OK | ERR_NOT_ENOUGH_RESOURCES | ERR_BUSY {
        // 身上的够用就不去拿了
        if (pc.store[RESOURCE_OPS] > opsNumber) return OK

        const workRoom = env.getRoomByName(roomName)
        const sourceStructure = getResourceStructure(workRoom, RESOURCE_OPS, opsNumber)
        if (!sourceStructure) return ERR_NOT_ENOUGH_RESOURCES

        // 拿取指定数量的 ops
        const actionResult = pc.withdraw(sourceStructure, RESOURCE_OPS, opsNumber)

        if (actionResult === OK) return OK
        else if (actionResult === ERR_NOT_IN_RANGE) {
            goTo(pc, sourceStructure.pos, { checkTarget: false })
            return ERR_BUSY
        }
        else {
            env.log.warning(`${pc.name} 执行 getOps 时出错，错误码 ${actionResult}`)
            return ERR_BUSY
        }
    }

    /**
     * 所有 power 的任务检查逻辑及工作逻辑
     *
     * @property PWR_* 常量之一，代表对应的任务
     * @value power 任务的具体配置项
     */
    const powerTasksHandler: Record<string, PowerTaskConfig> = {
        /**
         * 房间初始化任务，会在房间 power 任务队列初始化时同时添加
         * 该任务必定为房间的第一个 power 任务
         */
        [PWR_ENABLE_ROOM]: {
            target: creep => {
                creep.say('正在启用 Power')

                const result = creep.enableRoom(creep.room.controller)
                if (result === OK) return OK
                else if (result === ERR_NOT_IN_RANGE) {
                    goTo(creep, creep.room.controller.pos, { checkTarget: false })
                }
                return ERR_BUSY
            }
        },

        /**
         * 生成 ops 并存放至 terminal
         * 注意，PWR_GENERATE_OPS 任务永远不会返回 OK，没有其他任务来打断它就会一直执行
         */
        [PWR_GENERATE_OPS]: {
            /**
             * 搓 ops，搓够指定数量就存一下
             */
            source: creep => {
                const actionResult = creep.usePower(PWR_GENERATE_OPS)

                // 如果搓不了，说明有可能房间没激活，添加激活任务
                if (actionResult === ERR_INVALID_ARGS) maintenance.addTask(PWR_ENABLE_ROOM, 0)
                else if (actionResult !== OK) env.log.error(`${creep.name} ops 生成异常, 错误码: ${actionResult}`)

                // 数量够了就 target
                if (creep.store[RESOURCE_OPS] > 5) return OK
            },
            /**
             * 把 ops 存到 terminal 里
             */
            target: creep => {
                // 塞不进去就乐观点，继续干其他的活
                if (!creep.room.terminal || creep.room.terminal.store.getFreeCapacity() < 5) return OK

                const result = creep.transfer(creep.room.terminal, RESOURCE_OPS)

                // 够不到就移动
                if (result === ERR_NOT_IN_RANGE) {
                    goTo(creep, creep.room.terminal.pos)
                    return ERR_BUSY
                }
                // ops 不足就继续生成
                else if (result === ERR_NOT_ENOUGH_RESOURCES) {
                    return ERR_NOT_ENOUGH_RESOURCES
                }
            }
        },

        /**
         * 填充 extension
         */
        [PWR_OPERATE_EXTENSION]: {
            // 获取能量
            source: creep => getOps(creep, POWER_INFO[PWR_OPERATE_EXTENSION].ops),
            // 进行填充
            target: creep => {
                // 资源不足直接执行 source
                if (creep.store[RESOURCE_OPS] < POWER_INFO[PWR_OPERATE_EXTENSION].ops) return ERR_NOT_ENOUGH_RESOURCES

                // 获取能量来源
                const workRoom = env.getRoomByName(roomName)
                const sourceStructure = getResourceStructure(workRoom, RESOURCE_ENERGY, 100)
                // 没有来源则直接完成任务
                if (!sourceStructure) {
                    env.log.warning(`${creep.name} 没有找到包含足够能量的存储，移除 extension 填充任务`)
                    return OK
                }

                const actionResult = creep.usePower(PWR_OPERATE_EXTENSION, sourceStructure)

                if (actionResult === OK) return OK
                else if (actionResult === ERR_NOT_IN_RANGE) goTo(creep, sourceStructure.pos)
                else {
                    env.log.error(`[${roomName} ${creep.name}] 执行 PWR_OPERATE_EXTENSION target 时出错，错误码 ${actionResult}`)
                    return OK
                }
            }
        },

        /**
         * 强化 factory
         */
        [PWR_OPERATE_FACTORY]: {
            source: creep => getOps(creep, POWER_INFO[PWR_OPERATE_FACTORY].ops),
            target: creep => {
                // 资源不足直接执行 source
                if (creep.store[RESOURCE_OPS] < POWER_INFO[PWR_OPERATE_FACTORY].ops) return ERR_NOT_ENOUGH_RESOURCES

                const workRoom = env.getRoomByName(roomName)
                const factoryLevel = getFactoryLevel(workRoom)
                // 如果自己的 power 等级和工厂等级对不上
                if (creep.powers[PWR_OPERATE_FACTORY].level !== factoryLevel) {
                    env.log.warning(`自身 PWR_OPERATE_FACTORY 等级(${creep.powers[PWR_OPERATE_FACTORY].level})与工厂设置等级(${factoryLevel})不符，拒绝强化，任务已移除`)
                    return OK
                }

                const factory = getFactory(workRoom)
                const actionResult = creep.usePower(PWR_OPERATE_FACTORY, factory)

                if (actionResult === OK) return OK
                else if (actionResult === ERR_NOT_IN_RANGE) goTo(creep, factory.pos)
                else {
                    env.log.error(`[${roomName} ${creep.name}] 执行 PWR_OPERATE_FACTORY target 时出错，错误码 ${actionResult}`)
                    return OK
                }
            }
        },

        /**
         * 提高 storage 容量
         */
        [PWR_OPERATE_STORAGE]: {
            source: (creep) => getOps(creep, POWER_INFO[PWR_OPERATE_STORAGE].ops),
            target: creep => {
                // 资源不足直接执行 source
                if (creep.store[RESOURCE_OPS] < POWER_INFO[PWR_OPERATE_STORAGE].ops) return ERR_NOT_ENOUGH_RESOURCES

                const workRoom = env.getRoomByName(roomName)
                const actionResult = creep.usePower(PWR_OPERATE_STORAGE, workRoom.storage)

                if (actionResult === OK) return OK
                else if (actionResult === ERR_NOT_IN_RANGE) goTo(creep, workRoom.storage.pos)
                else {
                    env.log.error(`[${roomName} ${creep.name}] 执行 PWR_OPERATE_STORAGE target 时出错，错误码 ${actionResult}`)
                    return OK
                }
            }
        },

        /**
         * 强化 source
         */
        [PWR_REGEN_SOURCE]: {
            // regen_source 不需要 ops，所以没有 source 阶段
            source: () => OK,
            target: creep => {
                let target: Source
                const workRoom = env.getRoomByName(roomName)
                const memory = getMemory(workRoom)
                const sources = getSource(workRoom)
                if (!memory.sourceId) {
                    // 如果有 source 没有被强化，则将其选为目标
                    target = sources.find(s => {
                        if (!s.effects || !s.effects.map(e => e.effect).includes(PWR_REGEN_SOURCE)) {
                            // 缓存目标
                            memory.sourceId = s.id
                            return true
                        }
                        return false
                    })
                }
                // 有缓存了就直接获取
                else target = env.getObjectById(memory.sourceId)
                const actionResult = creep.usePower(PWR_REGEN_SOURCE, target)

                if (actionResult === OK) {
                    // 移除缓存
                    delete memory.sourceId
                    return OK
                }
                else if (actionResult === ERR_NOT_IN_RANGE) goTo(creep, target.pos)
                else {
                    env.log.error(`[${roomName} ${creep.name}] 执行 PWR_REGEN_SOURCE target 时出错，错误码 ${actionResult}`)
                    return OK
                }
            }
        }
    }

    return powerTasksHandler
}
