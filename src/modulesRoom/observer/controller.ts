import { createCache, createRoomLink, getFreeSpace } from '@/utils'
import { defaultContext } from './constants'
import { useDepositHarvester } from './hooks/useDepositHarvester'
import { useGlobalShow } from './hooks/useGlobalShow'
import { usePbAttacker } from './hooks/usePbAttacker'
import { usePbCarrier } from './hooks/usePbCarrier'
import { usePbHealer } from './hooks/usePbHealer'
import { ObserverMemory, ObserverContext } from './types'

export const createObserverController = function (context: ObserverContext) {
    const contextWithDefault = { ...context, ...defaultContext }
    const {
        getMemory, env, getObserver, depoMax, depoMaxCooldown, pbMax, pbFlagPrefix, depoFlagPrefix, obInterval
    } = contextWithDefault
    const { green } = env.colorful

    // 引入 depo 采集单位
    const releaseDepositHarvester = useDepositHarvester(context)
    // 引入 pb 运输单位
    const releasePbCarrier = usePbCarrier(context)
    // 引入 pb 治疗单位
    const { pbHealer, releasePbHealer } = usePbHealer(context)
    // 引入 pb 攻击单位
    const releasePbGroup = usePbAttacker(context, pbHealer, releasePbHealer, releasePbCarrier)

    const lazyLoader = function (roomName: string) {
        /**
         * 绘制 ob 检查范围
         */
        const drawMap = function (watchRooms: string[], checkRoomName: string) {
            watchRooms.forEach(watchRoomName => {
                const style: MapPolyStyle = { stroke: '#49a64d', strokeWidth: 1 }
                // 高亮显示当前正在检查的房间
                if (watchRoomName === checkRoomName) style.stroke = '#fffa00'

                const { map } = env.getGame()
                map.visual.rect(new RoomPosition(2, 2, watchRoomName), 3, 3, style)
            })
        }

        /**
         * 在房间内执行搜索
         * 该方法会搜索房间中的 deposits 和 power bank，一旦发现自动插旗
         */
        const searchRoom = function (memory: ObserverMemory): void {
            const { checkRoomName, depoList = [], pbList = [] } = memory

            // 从内存中获取要搜索的房间
            const cehckRoom = env.getRoomByName(checkRoomName)
            // 兜底
            if (!cehckRoom) {
                delete memory.checkRoomName
                return
            }
            // env.log.normal(`搜索房间 ${room.name}`)

            // 还没插旗的话就继续查找 deposit
            if (depoList.length < depoMax) {
                const deposits = cehckRoom.find(FIND_DEPOSITS)
                // 对找到的 deposit 进行归档
                deposits.forEach(deposit => {
                    // 冷却过长或者已经插旗的忽略
                    if (deposit.lastCooldown >= depoMaxCooldown) return
                    const flags = deposit.pos.lookFor(LOOK_FLAGS)
                    if (flags.length > 0) return

                    // 确认完成，插旗
                    harvestDeposit(deposit)
                    env.log.success(`${checkRoomName} 检测到新 deposit, 已插旗`)
                })
            }

            // 还没插旗的话就继续查找 pb
            if (pbList.length < pbMax) {
                // pb 的存活时间大于 3000 / power 足够大的才去采集
                const powerBanks = cehckRoom.find<StructurePowerBank>(FIND_STRUCTURES, {
                    filter: s => s.structureType === STRUCTURE_POWER_BANK &&
                        s.ticksToDecay >= 3000 && s.power >= 2000
                })
                // 对找到的 pb 进行归档
                powerBanks.forEach(powerBank => {
                    const flags = powerBank.pos.lookFor(LOOK_FLAGS)
                    if (flags.length > 0) return

                    // 确认完成，插旗
                    harvestPowerBank(powerBank)
                    env.log.success(`${checkRoomName} 检测到新 pb, 已插旗`)
                })
            }

            // 查一下之前有没有采集资源的旗帜，如果有旗但没资源了说明采集任务失败了，移除旗帜
            const existFlags = cehckRoom.find(FIND_FLAGS)
            existFlags.forEach(flag => {
                // 查 pb 旗子
                if (flag.name.startsWith(pbFlagPrefix)) {
                    const existRes = flag.pos.lookFor(LOOK_STRUCTURES).filter(s => {
                        return s.structureType === STRUCTURE_POWER_BANK
                    })
                    if (existRes.length === 0) flag.remove()
                }
                // 查 depo 旗子
                else if (flag.name.startsWith(depoFlagPrefix)) {
                    const existRes = flag.pos.lookFor(LOOK_DEPOSITS)
                    if (existRes.length === 0) flag.remove()
                }
            })

            // 确认该房间已被搜索
            delete memory.checkRoomName
        }

        /**
         * 发布 pb 采集任务
         */
        const harvestPowerBank = function (target: StructurePowerBank) {
            const harvestRoom = env.getRoomByName(roomName)
            const memory = getMemory(harvestRoom)
            const targetFlagName = `${pbFlagPrefix} ${roomName} ${env.getGame().time}`
            target.pos.createFlag(targetFlagName)

            // 更新数量
            memory.pbList.push(targetFlagName)
            // 计算应该发布的采集小组数量，最高两组
            const groupNumber = getFreeSpace(target.pos).length > 1 ? 2 : 1
            // 发布 attacker 和 healer，搬运者由 attacker 在后续任务中自行发布
            releasePbGroup(harvestRoom, targetFlagName, groupNumber)
        }

        /**
         * 发布 depo 采集任务
         */
        const harvestDeposit = function (target: Deposit) {
            const harvestRoom = env.getRoomByName(roomName)
            const memory = getMemory(harvestRoom)
            const targetFlagName = `${depoFlagPrefix} ${roomName} ${env.getGame().time}`
            target.pos.createFlag(targetFlagName)

            // 更新数量
            memory.depoList.push(targetFlagName)
            // 发布采集者，他会自行完成剩下的工作
            releaseDepositHarvester(harvestRoom, targetFlagName)
        }

        /**
         * 获取指定房间视野
         */
        const obRoom = function (observer: StructureObserver, memory: ObserverMemory): void {
            const { watchIndex = 0, watchRooms = [] } = memory
            // 执行视野获取
            const roomName = watchRooms[watchIndex]
            const obResult = observer.observeRoom(roomName)
            // env.log.normal(`ob 房间 ${roomName}`)

            // 标志该房间视野已经获取，可以进行检查
            if (obResult === OK) memory.checkRoomName = roomName

            // 设置下一个要查找房间的索引
            memory.watchIndex = watchRooms.length & (watchIndex + 1)
        }

        /**
         * 检查当前 depo 和 bp 旗帜是否失效
         * 会更新内存中的两个资源对应的 List 字段
         */
        const updateFlagList = function (): OK | ERR_NOT_FOUND {
            const room = env.getRoomByName(roomName)
            const memory = getMemory(room)
            const { pbList = [], depoList = [] } = memory
            const { flags } = env.getGame()

            /**
             * 检查旗帜是否失效
             * 会完成失效后的释放操作
             *
             * @param flagName 要检查的旗帜名称
             */
            const checkAliveFlag = function (flagName): boolean {
                if (flagName in flags) return true

                Memory.flags && delete Memory.flags[flagName]
                return false
            }

            memory.pbList = pbList.filter(checkAliveFlag)
            memory.depoList = depoList.filter(checkAliveFlag)

            return OK
        }

        /**
         * 显示当前监听的房间列表
         * 会高亮显示当前正在检查的房间
         */
        const showWatchList = function (): string {
            const { watchRooms = [], watchIndex = 0 } = getMemory(env.getRoomByName(roomName))
            if (watchRooms.length <= 0) return '暂无监听房间'

            const roomList = watchRooms.map((room, index) => {
                if (index === watchIndex) return green(room)
                else return room
            }).join(' ')

            return `监听中的房间列表: ${roomList}`
        }

        /**
         * 查看状态
         */
        const show = function (): string {
            const { watchRooms = [], pbList = [], depoList = [] } = getMemory(env.getRoomByName(roomName))
            if (watchRooms.length === 0) {
                return `[${roomName} observer] 未启用`
            }

            const logs = [`[${roomName} observer] 当前状态`, showWatchList()]

            // 更新旗帜列表，保证显示最新数据
            updateFlagList()

            // 正在采集的两种资源数量
            const pbNumber = pbList.length
            const depoNumber = depoList.length
            // 开采资源的所处房间
            const getFlagRoomLink = flagName => createRoomLink(env.getFlagByName(flagName).pos.roomName)
            const pbPos = pbList.map(getFlagRoomLink).join(' ')
            const depoPos = depoList.map(getFlagRoomLink).join(' ')

            logs.push(`[powerBank] 已发现：${pbNumber}/${pbMax} ${pbNumber ? '[位置]' : ''} ${pbPos}`)
            logs.push(`[deposit] 已发现：${depoNumber}/${depoMax} ${depoNumber ? '[位置]' : ''} ${depoPos}`)

            return logs.join('\n')
        }

        /**
         * 新增监听房间
         *
         * @param roomNames 要进行监听的房间名称
         */
        const addWatchRoom = function (...roomNames: string[]) {
            const memory = getMemory(env.getRoomByName(roomName))
            // 确保新增的房间名不会重复
            memory.watchRooms = _.uniq([...(memory.watchRooms || []), ...roomNames])
        }

        /**
         * 移除监听房间
         *
         * @param roomNames 不再监听的房间名
         */
        const removeWatchRoom = function (...roomNames: string[]) {
            const memory = getMemory(env.getRoomByName(roomName))
            memory.watchRooms = _.difference((memory.watchRooms || []), roomNames)
        }

        /**
         * 清空监听房间列表
         */
        const clearWatchRoom = function () {
            const memory = getMemory(env.getRoomByName(roomName))
            delete memory.watchRooms
        }

        /**
         * 暂停 observer
         */
        const off = function () {
            const memory = getMemory(env.getRoomByName(roomName))
            memory.pause = true
        }

        /**
         * 重启 observer
         */
        const on = function () {
            const memory = getMemory(env.getRoomByName(roomName))
            delete memory.pause
        }

        const run = function (): void {
            const room = env.getRoomByName(roomName)
            const observer = getObserver(room)
            // 没有初始化或者暂停了就不执行工作
            if (!observer) return

            const memory = getMemory(room)
            const { watchRooms = [], pause, pbList = [], depoList = [], checkRoomName } = memory

            if (watchRooms.length === 0) return
            if (pause) return

            // 都找到上限就不继续工作了
            if ((pbList.length >= pbMax) && (depoList.length >= depoMax)) return

            // 绘制搜索范围
            drawMap(watchRooms, checkRoomName)

            // 如果房间没有视野就获取视野，否则就执行搜索
            if (checkRoomName) searchRoom(memory)
            else if (!env.inInterval(obInterval)) obRoom(observer, memory)

            // 每隔一段时间检查下是否有 flag 需要清理
            if (!env.inInterval(100)) updateFlagList()
        }

        return { run, show, showWatchList, addWatchRoom, removeWatchRoom, clearWatchRoom, off, on, updateFlagList }
    }

    const [getObserverController] = createCache(lazyLoader)
    const globalShowObserver = useGlobalShow(context, room => getObserverController(room.name).updateFlagList())

    return { getObserverController, globalShowObserver }
}

export type ObserverController = ReturnType<ReturnType<typeof createObserverController>['getObserverController']>
