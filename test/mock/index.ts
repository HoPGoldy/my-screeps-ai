export { default as GameMock } from './Game'
export { default as RoomMock } from './Room'

import GameMock from './Game'

/**
 * 刷新游戏环境
 * 将 global 改造成类似游戏中的环境
 */
export const refreshGlobalMock = function () {
    global.Game = new GameMock() as Game
    global.Memory = {} as Memory
}