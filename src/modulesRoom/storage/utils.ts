import { green, red, yellow, createRoomLink } from '@/utils'

/**
 * 统计当前所有房间的存储状态
 */
export const showStorageAmountOverview = function (): string {
    // 建筑容量在小于如下值时将会变色
    const colorLevel = {
        [STRUCTURE_TERMINAL]: { warning: 60000, danger: 30000 },
        [STRUCTURE_STORAGE]: { warning: 150000, danger: 50000 }
    }

    const pad = content => _.padRight((content || '').toString(), 10)

    /**
     * 给数值添加颜色
     *
     * @param capacity 要添加颜色的容量数值
     * @param warningLimit 报警的颜色等级
     */
    const addColor = (capacity: number, structureType: STRUCTURE_TERMINAL | STRUCTURE_STORAGE): string => {
        if (capacity === undefined) return red('无法访问')

        const colorFunc = capacity > colorLevel[structureType].warning
            ? green
            : capacity > colorLevel[structureType].danger ? yellow : red

        return colorFunc(pad(capacity))
    }

    const logs = [
        '存储剩余容量 [storage 报警限制] ' +
        `${yellow(colorLevel[STRUCTURE_STORAGE].warning)} ` +
        `${red(colorLevel[STRUCTURE_STORAGE].danger)} [terminal 报警限制] ` +
        `${yellow(colorLevel[STRUCTURE_TERMINAL].warning)} ` +
        `${red(colorLevel[STRUCTURE_TERMINAL].danger)}`,
        '',
        pad('ROOM') + pad('STORAGE') + pad('TERMINAL'),
        ...Object.values(Game.rooms).map(room => {
            // 如果两者都没有或者房间无法被控制就不显示
            if ((!room.storage && !room.terminal) || !room.controller) return false

            let log = createRoomLink(pad(room.name))

            log += room.storage
                ? addColor(room.storage.store.getFreeCapacity(), STRUCTURE_STORAGE)
                : pad('X')

            log += room.terminal
                ? addColor(room.terminal.store.getFreeCapacity(), STRUCTURE_TERMINAL)
                : pad('X')

            return log
        }).filter(Boolean)
    ]

    return logs.join('\n')
}
