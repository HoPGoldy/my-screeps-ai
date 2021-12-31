export let showCpuCost: boolean | string = false
const pad = content => _.padRight((content || '').toString(), 40)

export const SHOW_BASE_CPU_COST = 'base'

export const collectCost = function <T extends (...args: any[]) => any>(name: string, type: string, func: T, ...args: Parameters<T>): ReturnType<T> {
    const cpu1 = Game.cpu.getUsed()
    const result = func(...args)
    if (showCpuCost && showCpuCost === type) {
        const cpu2 = Game.cpu.getUsed()
        const header = `[${name}]`
        const use = `use ${cpu2 - cpu1}`
        const total = `total ${cpu2}`
        console.log(`${pad(header)}${pad(use)}${pad(total)}`)
    }

    return result
}

export const switchShowCost = function (type?: string) {
    if (!type || showCpuCost === type) showCpuCost = false
    else showCpuCost = type

    return showCpuCost
}
