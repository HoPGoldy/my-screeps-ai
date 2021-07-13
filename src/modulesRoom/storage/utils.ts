import { Color, colorful, createRoomLink } from "@/modulesGlobal"

/**
 * 统计当前所有房间的存储状态
 */
export const showStorageAmountOverview = function(): string {
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
        if (capacity === undefined) return colorful('无法访问', Color.Red)

        const color = capacity > colorLevel[structureType].warning ? Color.Green : 
            capacity > colorLevel[structureType].danger ? Color.Yellow : Color.Red

        return colorful(_.padRight(capacity.toString(), 9), color)
    }

    const logs = [
        `存储剩余容量 [storage 报警限制] ${colorful(colorLevel[STRUCTURE_STORAGE].warning.toString(), Color.Yellow)} ${colorful(colorLevel[STRUCTURE_STORAGE].danger.toString(), Color.Red)} [terminal 报警限制] ${colorful(colorLevel[STRUCTURE_TERMINAL].warning.toString(), Color.Yellow)} ${colorful(colorLevel[STRUCTURE_TERMINAL].danger.toString(), Color.Red)}`,
        '',
        _.padRight('ROOM', 8) + _.padRight('STORAGE', 9) + _.padRight('TERMINAL', 9),
        ...Object.values(Game.rooms).map(room => {
            // 如果两者都没有或者房间无法被控制就不显示
            if ((!room.storage && !room.terminal) || !room.controller) return false

            let log = createRoomLink(room.name, 2)

            log += room.storage ?
                addColor(room.storage.store.getFreeCapacity(), STRUCTURE_STORAGE) :
                _.padRight('X', 9)

            log += room.terminal ?
                addColor(room.terminal.store.getFreeCapacity(), STRUCTURE_TERMINAL) :
                _.padRight('X', 9)

            return log
        }).filter(Boolean)
    ]

    return logs.join('\n')
}