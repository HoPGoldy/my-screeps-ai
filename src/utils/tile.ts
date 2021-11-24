/**
 * 在指定房间显示 cost
 *
 * @param cost 要显示的 cost
 * @param room 要显示到的房间
 */
export const showCost = function (cost: CostMatrix, room: Room): void {
    for (let x = 1; x < 49; x++) {
        for (let y = 1; y < 49; y++) {
            room.visual.text(cost.get(x, y).toString(), x, y, {
                color: '#a9b7c6',
                font: 0.5,
                opacity: 0.7
            })
        }
    }
}

/**
 * 创建坐标值数组
 * 一般用于范围计算时获取周围的 x, y 轴坐标
 * 例如 center=30, range=2，会返回 [28, 29, 30, 31, 32]
 *
 * @param center 中心点的坐标值
 * @param range 左右延申的范围
 * @returns 以 center 为中心，已 range 为范围的坐标值数组
 */
export const getRangeIndex = function (center: number, range: number) {
    const indexs = Array.from({ length: range * 2 + 1 }).map((_, index) => center - range + index)
    return indexs.filter(index => index >= 0 && index <= 49)
}

/**
 * 游戏中 CostMatrix 的升级版
 * 游戏里的 CostMatrix 只能存放 0 - 255 的数字，无法满足复杂场景下的使用需求
 * 所以就诞生了这个东西，可以存放任意类型的值
 */
export interface RoomTileMap<T> {
    set: (x: number, y: number, value: T) => void
    get: (x: number, y: number) => T
    map: <R>(callback: (x: number, y: number, value: T) => R) => R[][]
    clone: () => RoomTileMap<T>
}

/**
 * 创建 RoomTileMap
 */
export const createTileMap = function <T = true> (initialCallback?: (x: number, y: number) => T): RoomTileMap<T> {
    let data: T[][]

    // 没有初始化函数的话就默认填充为 true
    if (initialCallback) {
        data = Array.from({ length: 50 }).map((_, x) => {
            return Array.from({ length: 50 }).map((_, y) => {
                return initialCallback(x, y)
            })
        })
    }
    else {
        data = Array(50).fill(Array(50).fill(true))
    }

    const set = function (x: number, y: number, value: T) {
        data[x][y] = value
    }

    const get = function (x: number, y: number): T {
        try {
            return data[x][y]
        }
        catch (e) {
            console.log(e)
            console.log(x, y, data[x])
        }
    }

    const map = function <R> (callback: (x: number, y: number, value: T) => R): R[][] {
        return Array.from({ length: 50 }).map((_, x) => {
            return Array.from({ length: 50 }).map((_, y) => {
                return callback(x, y, data[x][y])
            })
        })
    }

    const clone = function (): RoomTileMap<T> {
        return createTileMap((x, y) => data[x][y])
    }

    return { set, get, map, clone }
}
