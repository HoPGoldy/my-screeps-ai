import { createCache } from '@/utils'
import { ENERGY_SHARE_LIMIT } from '../storage/constant'
import { ShareContext } from './types'
import { getSendAmount } from './utils'

export const createShareController = function (context: ShareContext) {
    const { getGlobalMemory, getRoomRes, getMemory, clearMemory, hasTransportTask, addTransportTask, env } = context
    const lazyLoader = function (roomName: string) {
        /**
         * 向其他房间请求资源共享
         *
         * @param resourceType 请求的资源类型
         * @param amount 请求的数量
         * @returns 响应请求的房间
         */
        const request = function (resourceType: ResourceConstant, amount: number): Room {
            const targetRoom = getSource(resourceType)
            if (!targetRoom) return undefined

            const targetRoomShare = getShareController(targetRoom.name)
            const addResult = targetRoomShare.handle(roomName, resourceType, amount)
            return addResult ? targetRoom : undefined
        }

        /**
         * 将本房间添加至资源来源表中
         *
         * @param resourceType 添加到的资源类型
         */
        const becomeSource = function (resourceType: ResourceConstant): boolean {
            const resourceSource = getGlobalMemory()
            if (!(resourceType in resourceSource)) resourceSource[resourceType] = []

            const alreadyRegister = resourceSource[resourceType].find(name => name === roomName)
            // 如果已经被添加过了就返回 false
            if (alreadyRegister) return false

            resourceSource[resourceType].push(roomName)
            return true
        }

        /**
         * 从资源来源表中移除本房间
         *
         * @param resourceType 从哪种资源类型中移除
         */
        const leaveSource = function (resourceType: ResourceConstant): void {
            const resourceSource = getGlobalMemory()
            // 没有该资源就直接停止
            if (!(resourceType in resourceSource)) return

            // 获取该房间在资源来源表中的索引
            _.pull(resourceSource[resourceType], roomName)
            // 列表为空了就直接移除
            if (resourceSource[resourceType].length <= 0) delete resourceSource[resourceType]
        }

        /**
         * 让本房间处理共享任务
         *
         * @param targetRoom 资源发送到的房间
         * @param resourceType 共享资源类型
         * @param amount 共享资源数量
         * @returns 是否成功添加
         */
        const handle = function (targetRoom: string, resourceType: ResourceConstant, amount: number): boolean {
            const selfRoom = env.getRoomByName(roomName)
            const selfShareTask = getMemory(selfRoom)
            if (!selfRoom || selfShareTask || !selfRoom.terminal) return false

            // 本房间内指定资源的存量
            const total = getRoomRes(selfRoom, resourceType)

            Object.assign(selfShareTask, {
                target: targetRoom,
                resourceType,
                // 期望发送量、当前存量中找最小的
                // 这里不会考虑终端的发送量，因为处理共享任务时可以分批多次发送
                amount: Math.min(amount, total)
            })

            return true
        }

        /**
         * 执行已经存在的共享任务
         *
         * @param terminal 执行任务的终端
         */
        const execShareTask = function (terminal: StructureTerminal): void {
            const shareTask = getMemory(terminal.room)
            if (!shareTask) return
            const { amount: taskAmount, resourceType, target } = shareTask

            if (taskAmount <= 0) {
                env.log.warning(`共享资源的数量不可为负 (${resourceType}/${taskAmount})，任务已移除`)
                clearMemory(terminal.room)
                return
            }

            const total = getRoomRes(terminal.room, resourceType)
            // 获取本次要发送的数量
            const { amount: sendAmount, cost } = getSendAmount(
                Math.min(taskAmount, total),
                resourceType,
                target,
                terminal.room.name,
                terminal.store.getFreeCapacity(),
                terminal.store[resourceType],
                terminal.store[RESOURCE_ENERGY]
            )

            // const result = `${sendAmount - terminal.store[resourceType] + cost - terminal.store[RESOURCE_ENERGY]}/${terminal.store.getFreeCapacity()}`
            // console.log(roomName, '共享任务计算结果', target, resourceType, sendAmount, cost)

            if (sendAmount <= 0) {
                env.log.warning(`${roomName} Terminal 剩余空间不足 (${resourceType}/${taskAmount})，任务已移除`)
                clearMemory(terminal.room)
                return
            }

            // 如果终端存储的资源数量已经足够了
            if (terminal.store[resourceType] >= sendAmount) {
                sendShareResource(resourceType, sendAmount, cost, target, terminal)
            }
            // 如果不足就尝试运过来
            else {
                getShareResource(resourceType, sendAmount, target, terminal)
            }
        }

        /**
         * 执行资源发送
         */
        const sendShareResource = function (
            resourceType: ResourceConstant,
            sendAmount: number,
            cost: number,
            target: string,
            terminal: StructureTerminal
        ) {
            if (hasTransportTask(terminal.room)) return

            // 是否需要转移能量进来
            // 如果要转移能量就需要对路费进行针对检查
            const needGetEnergy = (resourceType === RESOURCE_ENERGY)
                ? terminal.store[RESOURCE_ENERGY] - sendAmount < cost
                : terminal.store[RESOURCE_ENERGY] < cost

            // 如果路费不够的话就继续等
            if (needGetEnergy) {
                addTransportTask(terminal.room, [
                    { from: terminal.room.storage.id, to: terminal.id, resType: RESOURCE_ENERGY, amount: cost }
                ])
                return
            }

            // 路费够了就执行转移
            const sendResult = terminal.send(
                resourceType, sendAmount, target,
                `HaveFun! 来自 ${terminal.owner.username} 的资源共享 - ${roomName}`
            )

            // 任务执行成功，更新共享任务
            if (sendResult === OK) updateTaskAmount(sendAmount)
            else if (sendResult === ERR_INVALID_ARGS) {
                env.log.warning('共享任务参数异常，无法执行传送，已移除')
                clearMemory(terminal.room)
            }
            else env.log.warning(`执行共享任务出错, 错误码：${sendResult}`)
        }

        /**
         * terminal 里的资源不足，执行资源获取
         */
        const getShareResource = function (
            resType: ResourceConstant,
            sendAmount: number,
            target: string,
            terminal: StructureTerminal
        ) {
            if (hasTransportTask(terminal.room)) return

            const total = getRoomRes(terminal.room, resType)
            if (total < sendAmount) {
                env.log.normal(
                    `由于 ${resType} 资源不足 ${terminal.store[resType] || 0}/${sendAmount}` +
                    `${target} 的共享任务已被移除`
                )
                clearMemory(terminal.room)
                return
            }

            const amount = sendAmount - terminal.store[resType]

            addTransportTask(terminal.room, [
                { from: terminal.room.storage.id, to: terminal.id, resType, amount }
            ])
        }

        /**
         * 更新共享任务资源数量
         * 如果一次发不完的话，可以使用该方法更新资源数量
         * 如果任务更新后数量为 0 的话就会移除任务
         *
         * @param sendedAmount 已经发送的资源数量
         * @returns 是否更新成功
         */
        const updateTaskAmount = function (sendedAmount: number): OK | ERR_NOT_FOUND {
            const room = env.getRoomByName(roomName)
            const memory = getMemory(room)
            if (!memory) return ERR_NOT_FOUND

            memory.amount = memory.amount - sendedAmount
            if (memory.amount <= 0) clearMemory(room)
        }

        /**
         * 根据资源类型查找来源房间
         *
         * @param resourceType 要查找的资源类型
         * @returns 找到的目标房间，没找到返回 null
         */
        const getSource = function (resourceType: ResourceConstant): Room | null {
            const resourceSource = getGlobalMemory()
            const sourceRoomsNames = resourceSource?.[resourceType]
            if (!sourceRoomsNames) return null

            // 寻找合适的房间
            let targetRoom: Room
            // 变量房间名数组，注意，这里会把所有无法访问的房间筛选出来
            resourceSource[resourceType] = sourceRoomsNames.filter(roomName => {
                const room = env.getRoomByName(roomName)

                // 该房间有任务或者就是自己，不能作为共享来源
                // 终端空余空间太少的话也会拒绝发送
                if (
                    !room || room.name === roomName ||
                    !room.terminal || room.terminal.store.getFreeCapacity() < 1000
                ) return false

                const roomShare = getShareController(roomName)
                if (roomShare.hasShareTask()) return true

                const existAmount = getRoomRes(room, resourceType)

                // 如果请求共享的是能量
                if (resourceType === RESOURCE_ENERGY) {
                    if (!room.storage) return false
                    // 该房间的能量低于要求的话，就从资源提供列表中移除该房间
                    if (existAmount < ENERGY_SHARE_LIMIT) return false
                }

                // 如果请求的资源已经没有的话就暂时跳过（因为无法确定之后是否永远无法提供该资源）
                if (existAmount <= 0) return true

                // 接受任务的房间就是你了！
                targetRoom = room
                return true
            })

            return targetRoom
        }

        /**
         * 当前是否有共享任务
         */
        const hasShareTask = function () {
            const room = env.getRoomByName(roomName)
            const memory = getMemory(room)
            return !!memory
        }

        /**
         * 显示共享任务详情
         */
        const show = function (): string {
            const room = env.getRoomByName(roomName)
            const { terminal, storage } = room
            if (!terminal) return '该房间暂无 terminal，无法执行共享任务'
            const memory = getMemory(room)
            if (Object.keys(memory).length <= 0) return '暂无共享任务'
            const { target, resourceType, amount } = memory

            const logs = [
                '正在执行共享任务: ',
                `[目标房间] ${target} [资源类型] ${resourceType} [共享数量] ${amount}`,
                '当前终端状态：',
                `[剩余空间] ${terminal.store.getFreeCapacity()} ` +
                `[${resourceType} 数量] ${terminal.store[resourceType]} ` +
                `[能量数量] ${terminal.store[RESOURCE_ENERGY]}`
            ]

            if (storage) {
                logs.push(
                    '当前 Storage 状态：',
                    `[剩余空间] ${storage.store.getFreeCapacity()} ` +
                `[${resourceType} 数量] ${storage.store[resourceType]} ` +
                `[能量数量] ${storage.store[RESOURCE_ENERGY]}`
                )
            }

            return logs.join('\n')
        }

        return { request, becomeSource, leaveSource, hasShareTask, handle, execShareTask, show }
    }

    const [getShareController] = createCache(lazyLoader)
    return getShareController
}

export type ShareController = ReturnType<ReturnType<typeof createShareController>>
