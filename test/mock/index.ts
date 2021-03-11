export { getMockRoom } from './Room'
export { getMockCreep } from './Creep'
export { getMockGame } from './Game'
export { getMockMemory } from './Memory'
export * from './utils'

import { getMockGame } from './Game'
import { getMockMemory } from './Memory'
import constants from './constant'
import * as _ from 'lodash'

/**
 * 刷新游戏环境
 * 将 global 改造成类似游戏中的环境
 */
export const refreshGlobalMock = function () {
    global.Game = getMockGame()
    global.Memory = getMockMemory()
    global._ = _
    Object.assign(global, constants)
}