/**
 * 当所有墙的生命值高于这个值时才会放置新的墙壁工地
 */
export const BUILD_NEW_WALL_LIMIT = 20000

/**
 * 每次建造添加的墙壁数量
 */
export const BUILD_ADD_NUMBER = 4

/**
 * 在不同 RCL 时，房间应该刷墙到多少血
 */
export const MAX_WALL_HITS = {
    4: 500000,
    5: 1000000,
    6: 2000000,
    7: 5000000,
    8: 20000000
}
