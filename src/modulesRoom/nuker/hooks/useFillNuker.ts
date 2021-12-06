import { NukerContext } from '../types'

export const useFillNuker = function (roomName: string, context: NukerContext) {
    const { scanState, getRoomNuker, getResAmount, hasFillNukerTask, addFillNukerTask, env } = context

    /**
     * 将自身存储的资源维持在指定容量之上
     *
     * @param nuker 要填充的 nuker 本体
     * @param resource 要检查的资源
     * @param needFillLimit 当资源余量少于该值时会发布搬运任务
     * @param sourceLimit 资源来源建筑中剩余目标资源最小值（低于该值将不会发布资源获取任务）
     * @param amount 要转移的话每次转移多少数量
     * @returns 该资源是否足够
     */
    const keepResource = function (nuker: StructureNuker, resType: ResourceConstant, needFillLimit: number, sourceLimit: number, amount: number): boolean {
        if (nuker.store[resType] >= needFillLimit) return true

        const roomRemaining = getResAmount(nuker.room, resType)
        if (roomRemaining > sourceLimit && !hasFillNukerTask(nuker.room)) {
            addFillNukerTask(nuker, resType, Math.min(amount, roomRemaining))
        }

        return false
    }

    const run = function () {
        const nuker = getRoomNuker(env.getRoomByName(roomName))
        if (!nuker) return

        scanState && scanState(nuker)
        if (env.inInterval(30)) return

        // 能量不满并且 storage 能量大于 300k 则开始填充能量
        if (!keepResource(nuker, RESOURCE_ENERGY, NUKER_ENERGY_CAPACITY, 300000, 500)) return
        // G 矿不满并且 terminal 中有 G 矿则开始填充 G
        keepResource(nuker, RESOURCE_GHODIUM, NUKER_GHODIUM_CAPACITY, 0, 100)
    }

    return { run }
}
