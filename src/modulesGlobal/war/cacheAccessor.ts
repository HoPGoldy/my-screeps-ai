export const createCacheAccessor = function () {
    let cachedCostMatrix: { [roomName: string]: CostMatrix } = {}

    const setCostMatrix = function (roomName: string, newCost: CostMatrix) {
        cachedCostMatrix[roomName] = newCost
    }

    const getCostMatrix = function (roomName: string): CostMatrix | undefined {
        return cachedCostMatrix[roomName]
    }

    const refresh = function () {
        cachedCostMatrix = {}
    }

    return { setCostMatrix, getCostMatrix, refresh }
}