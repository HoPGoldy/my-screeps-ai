import { BASE_MINERAL, getFreeSpace } from '@/utils'
import { DROP_TARGET, MAX_DROP_AMOUNT, TerminalChannel, TerminalMode } from '../constants'
import { TerminalMemoryAccessor } from '../memory'
import { TerminalContext } from '../types'
import { unstringifyTask } from '../utils'

export const useMaintenance = function (roomName: string, context: TerminalContext, db: TerminalMemoryAccessor) {
    const {
        getMemory, env, balanceResource, hasShareTask, hasTransportTask, addTransportTask, getMineral,
        getResource, addShareTask
    } = context

    /**
     * 自己剩余空间不足时会尝试腾出来一些空间
     */
    const runBalanceResource = function () {
        const room = env.getRoomByName(roomName)

        if (balanceResource && room.storage?.store.getFreeCapacity() > 0) {
            env.log.normal('剩余空间不足，执行资源平衡')
            balanceResource(room)
            return
        }

        const { store } = room.terminal

        // storage 也没地方放了，开始丢资源，先找到要丢哪个
        const targetRes = DROP_TARGET.reduce((pre, cur) => {
            return (store.getUsedCapacity(pre) || 0) > (store.getUsedCapacity(cur) || 0) ? pre : cur
        })

        const targetAmount = Math.min(store[targetRes], MAX_DROP_AMOUNT)

        if (targetAmount <= 0) return
        env.log.normal(`${room.name} 剩余空间不足，将丢弃资源 ${targetRes} ${targetAmount}`)
        if (hasTransportTask(room)) return

        const { x, y, roomName: dropRoomName } = getFreeSpace(room.terminal.pos)?.[0] || {}
        addTransportTask(room, [{
            from: room.terminal.id,
            to: [x, y, dropRoomName],
            resType: targetRes,
            amount: targetAmount
        }])
    }

    /**
     * 将终端监听规则设置为默认值
     *
     * @param hard 设为 true 来移除其默认值中不包含的规则
     */
    const resetConfig = function (hard = false): void {
        const room = env.getRoomByName(roomName)
        const memory = getMemory(room)

        if (!memory.tasks) memory.tasks = []
        if (hard) memory.tasks = []
        memory.index = 0

        // 该房间的矿物种类
        const roomMineral = getMineral(room).mineralType

        // 默认选项为从资源共享协议获取所有的基础元素，自己房间的产出矿物则为提供
        BASE_MINERAL.forEach(res => {
            if (res === roomMineral) {
                db.insertListenTask(res, 30000, TerminalMode.Put, TerminalChannel.Share)
            }
            else {
                db.insertListenTask(res, 5000, TerminalMode.Get, TerminalChannel.Share)
            }
        })
    }

    /**
     * 平衡 power
     * 将自己存储的多余 power 转移至其他房间
     * 只会平衡到执行了 powerSpawn.on() 的房间
     *
     * @returns ERR_NOT_ENOUGH_RESOURCES power 的资源不足
     * @returns ERR_NAME_EXISTS 房间内已经存在 shareTask
     * @returns ERR_NOT_FOUND 未找到有效的目标房间或者 terminal
     */
    const balancePower = function (): OK | ERR_NOT_ENOUGH_RESOURCES | ERR_NAME_EXISTS | ERR_NOT_FOUND {
        const room = env.getRoomByName(roomName)
        // 已经有共享任务了也不会执行
        if (hasShareTask && hasShareTask(room)) return ERR_NAME_EXISTS

        // 允许共享的下限
        const SHARE_LIMIE = 10000
        if (!room.terminal || !addShareTask) return ERR_NOT_FOUND
        // power 足够才能共享
        if (room.terminal.store[RESOURCE_POWER] < SHARE_LIMIE) return ERR_NOT_ENOUGH_RESOURCES

        // 找到 power 数量最少的已启用 ps 房间的信息
        const targetRoomInfo = Object.values(env.getGame().rooms)
            // 统计出所有目标房间的 power 数量
            .map(room => {
                // 无法正常接收的不参与计算
                if (!room.terminal) return { room, number: null }

                const number = getResource(room, RESOURCE_POWER)
                return { room, number }
            })
            // 移除掉所有不参与计算的房间
            .filter(info => info.number !== null)
            // 找到 power 数量最小的房间
            .reduce((prev, next) => prev.number > next.number ? next : prev)

        // 添加共享任务
        if (!targetRoomInfo || !targetRoomInfo.room) return ERR_NOT_FOUND
        addShareTask(room, targetRoomInfo.room, RESOURCE_POWER, SHARE_LIMIE)

        return OK
    }

    /**
     * 显示所有终端监听任务
     */
    const show = function (): string {
        const room = env.getRoomByName(roomName)
        const memory = getMemory(room)

        if (!memory || !memory.tasks) return '该房间暂无终端监听任务'
        const { tasks, index: currentIndex } = memory

        // 从 code 转换为介绍，提高可读性
        const channelIntroduce: { [action in TerminalChannel]: string } = {
            [TerminalChannel.Take]: '拍单',
            [TerminalChannel.Release]: '挂单',
            [TerminalChannel.Share]: '共享'
        }

        const modeIntroduce: { [action in TerminalMode]: string } = {
            [TerminalMode.Get]: 'get',
            [TerminalMode.Put]: 'put'
        }

        // 遍历所有任务绘制结果
        return tasks.map((taskStr, index) => {
            const task = unstringifyTask(taskStr)
            const logs = [
                `[${index}] ${env.colorful.blue(task.type)}`,
                `[当前/期望] ${room.terminal?.store[task.type] || 'x'}/${task.amount}`,
                `[类型] ${modeIntroduce[task.mod]}`,
                `[渠道] ${channelIntroduce[task.channel]}`
            ]
            if (task.priceLimit) logs.push(`[价格${task.mod === TerminalMode.Get ? '上限' : '下限'}] ${task.priceLimit}`)
            if (index === currentIndex) logs.push('< 正在检查')
            return '  ' + logs.join(' ')
        }).join('\n')
    }

    return { runBalanceResource, resetConfig, balancePower, show }
}
