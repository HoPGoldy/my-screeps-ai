import { getMock } from './utils'

/**
 * 伪造的全局 Game 类
 */
export class GameMock {
    creeps = {}
    rooms = {}
    spawns = {}
    time = 1
}

/**
 * 创建一个伪造的 Game 实例
 */
 export const getMockGame = getMock<Game>(GameMock)