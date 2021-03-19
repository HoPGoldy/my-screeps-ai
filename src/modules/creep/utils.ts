import { colorful } from "@/utils"

/**
 * creep 移除配置项
 */
export interface RemoveCreepOptions {
    /**
     * 【可选】是否批量移除，默认只会移除匹配到的第一个 creep
     */
    batch: boolean
    /**
     * 【可选】是否立刻移除，默认会在 creep 自然老死后移除
     */
    immediate: boolean
}

/**
 * 移除指定 creep
 * 会移除名字中包含第一个参数的 creep
 * 
 * @param creepNamePart 要移除的 creep 名称部分
 * @param opts 移除配置项
 */
export const removeCreep = function (creepNamePart: string, opts: Partial<RemoveCreepOptions> = {}) {
    const options: RemoveCreepOptions = _.defaults(opts, { batch: false, immediate: false })

    const removeFunc = (creep: Creep) => {
        if (!creep.name.includes(creepNamePart)) return false

        if (options.immediate) {
            // 要删除内存再杀掉，不然会重新孵化
            delete Memory.creeps[creep.name]
            creep.suicide()
        }
        else creep.memory.cantRespawn = true

        return true
    }

    const creeps = Object.values(Game.creeps)

    // 如果指定了批量的话就遍历所有 creep
    if (options.batch) creeps.forEach(removeFunc)
    // 否则只移除匹配到的第一个
    else creeps.find(removeFunc)
}

/**
 * 格式化输出所有 creep 配置
 */
export const showCreep = function (): string {
    const allCreeps = Object.values(Game.creeps)
    if (allCreeps.length === 0) return `暂无 creep 配置`

    // 将 creep 的配置进行格式化
    let format: { [roomName: string]: string[] } = {}

    // 遍历所有配置项并格式化
    for (const { name, spawning, ticksToLive, memory } of allCreeps) {
        // 兜底，创建输出中的房间标题
        if (!(memory.spawnRoom in format)) format[memory.spawnRoom] = [ `${memory.spawnRoom} 下属 creep：` ]
        
        // 检查该单位的存活状态
        let liveStats: string = ''
        if (spawning) liveStats = colorful('孵化中', 'yellow')
        else liveStats = `${colorful('存活', 'green')} 剩余生命 ${ticksToLive}`

        format[memory.spawnRoom].push(`  - [${name}] [角色] ${memory.role} [当前状态] ${liveStats}`)
    }

    let logs = []
    Object.values(format).forEach(roomCreeps => logs.push(...roomCreeps))
    logs.unshift(`当前共有 creep  ${allCreeps.length} 只`)
    return logs.join('\n')
}

/**
 * 是否存在指定 creep
 * 
 * @param creepName 要检查是否存在的 creep 名称
 */
export const hasCreep = function (creepName: string): boolean {
    return creepName in Game.creeps
}