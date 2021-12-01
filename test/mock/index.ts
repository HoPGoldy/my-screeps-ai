import { getMockGame } from './Game'
import { getMockMemory } from './Memory'
import * as _ from 'lodash'

export { getMockRoom } from './Room'
export { getMockCreep } from './Creep'
export { getMockGame } from './Game'
export { getMockVisual } from './RoomVisual'
export { getMockSpawn } from './structures/Spawn'
export { getMockMemory } from './Memory'
export { getTestEnvContext } from './envContext'
export * from './utils'

/**
 * 刷新游戏环境
 * 将 global 改造成类似游戏中的环境
 */
export const refreshGlobalMock = function () {
    global.Game = getMockGame()
    // @ts-ignore
    global.Memory = getMockMemory()
    global._ = _
    Object.assign(global, require('@screeps/common/lib/constants'))
}
