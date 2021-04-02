export const loop = () => {
    RawMemory.setActiveSegments([1])
    const cost = new PathFinder.CostMatrix
    
    cost.set(1, 2, 3)
    cost.set(2, 2, 14)
    // cost.set(3, 4, 14)
    // cost.set(3, 5, 14)

    const data = serializeCost(cost)
    RawMemory.segments[1] = data

    const desData = deserializeCost(data)
    RawMemory.segments[2] = JSON.stringify(desData.serialize())
}

const serializeCost = function(cost: CostMatrix): string {
    const rawList = cost.serialize()
    const groupList = []

    let currentVal: number = rawList[0]
    let notRepeatIndex: number = 0
    // 这里用的 <= 长度，所以最后会有一个 i = undefined 的循环，通过这个循环保存最后一截数据
    for (let i = 1; i <= rawList.length; i++) {
        const checkVal = rawList[i]
        if (checkVal === currentVal) continue
        
        const repeatCount = i - notRepeatIndex
        if (repeatCount > 1) groupList.push(`${currentVal}x${repeatCount}`)
        else groupList.push(currentVal)

        currentVal = checkVal
        notRepeatIndex = i
    }

    return groupList.join(' ')
}

const deserializeCost = function (rawCost: string): CostMatrix {
    const groupList = rawCost.split(' ')
    const rawList = [].concat(...groupList.map(group => {
        const [ val, count ] = group.split('x')
        return Array(Number(count) || 1).fill(val)
    }))

    return PathFinder.CostMatrix.deserialize(rawList)
}