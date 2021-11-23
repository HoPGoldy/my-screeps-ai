import { green, red, yellow, createRoomLink } from '@/modulesGlobal'

/**
 * 统计当前所有房间的存储状态
 */
export const showStorageAmountOverview = function (): string {
    // 建筑容量在小于如下值时将会变色
    const colorLevel = {
        [STRUCTURE_TERMINAL]: { warning: 60000, danger: 30000 },
        [STRUCTURE_STORAGE]: { warning: 150000, danger: 50000 }
    }

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

        return colorFunc(_.padRight(capacity.toString(), 9))
    }

    const logs = [
        '存储剩余容量 [storage 报警限制] ' +
        `${yellow(colorLevel[STRUCTURE_STORAGE].warning.toString())} ` +
        `${red(colorLevel[STRUCTURE_STORAGE].danger.toString())} [terminal 报警限制] ` +
        `${yellow(colorLevel[STRUCTURE_TERMINAL].warning.toString())} ` +
        `${red(colorLevel[STRUCTURE_TERMINAL].danger.toString())}`,
        '',
        _.padRight('ROOM', 8) + _.padRight('STORAGE', 9) + _.padRight('TERMINAL', 9),
        ...Object.values(Game.rooms).map(room => {
            // 如果两者都没有或者房间无法被控制就不显示
            if ((!room.storage && !room.terminal) || !room.controller) return false

            let log = createRoomLink(room.name, 2)

            log += room.storage
                ? addColor(room.storage.store.getFreeCapacity(), STRUCTURE_STORAGE)
                : _.padRight('X', 9)

            log += room.terminal
                ? addColor(room.terminal.store.getFreeCapacity(), STRUCTURE_TERMINAL)
                : _.padRight('X', 9)

            return log
        }).filter(Boolean)
    ]

    return logs.join('\n')
}
