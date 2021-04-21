import { colorful } from "@/utils"

/**
 * 统计当前所有房间的存储状态
 */
export default function(): string {
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
        if (!capacity) return colorful('无法访问', 'red')
        return capacity > colorLevel[structureType].warning ? colorful(capacity.toString(), 'green') : 
            capacity > colorLevel[structureType].danger ? colorful(capacity.toString(), 'yellow') : colorful(capacity.toString(), 'red')
    }

    const logs = [
        `剩余容量/总容量 [storage 报警限制] ${colorful(colorLevel[STRUCTURE_STORAGE].warning.toString(), 'yellow')} ${colorful(colorLevel[STRUCTURE_STORAGE].danger.toString(), 'red')} [terminal 报警限制] ${colorful(colorLevel[STRUCTURE_TERMINAL].warning.toString(), 'yellow')} ${colorful(colorLevel[STRUCTURE_TERMINAL].danger.toString(), 'red')}`,
        '',
        ...Object.values(Game.rooms).map(room => {
            // 如果两者都没有或者房间无法被控制就不显示
            if ((!room.storage && !room.terminal) || !room.controller) return false

            let log = `[${room.name}] `
            if (room.storage) log += `STORAGE: ${addColor(room.storage.store.getFreeCapacity(), STRUCTURE_STORAGE)}/${room.storage.store.getCapacity() || '无法访问'} `
            else log += 'STORAGE: X '

            if (room.terminal) log += `TERMINAL: ${addColor(room.terminal.store.getFreeCapacity(), STRUCTURE_TERMINAL)}/${room.terminal.store.getCapacity() || '无法访问'} `
            else log += 'TERMINAL: X '

            return log
        }).filter(Boolean)
    ]

    return logs.join('\n')
}