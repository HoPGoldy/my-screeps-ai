export { getMockRoom } from './Room'
export { getMockCreep } from './Creep'

import GameMock from './Game'
import constants from './constant'
import { spy } from 'sinon'

/**
 * 刷新游戏环境
 * 将 global 改造成类似游戏中的环境
 */
export const refreshGlobalMock = function () {
    global.Game = new GameMock() as Game
    global.Memory = {} as Memory
    Object.assign(global, constants)
}

/**
 * 创建 Game.getObjectById
 * @param items 用于搜索的对象数组，每个对象都应包含 id
 */
export const mockGetObjectById = function (items: ObjectWithId[]) {
    return Game.getObjectById = spy((id: string) => items.find(item => item.id === id))
}