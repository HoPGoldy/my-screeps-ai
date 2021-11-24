import { getMock } from './utils'

/**
 * 伪造的全局 Game 类
 */
export class GameMock {
    shard = { name: 'mockShard' }
    creeps = {}
    rooms = {}
    spawns = {}
    time = 1
    notify = jest.fn()
}

/**
 * 创建一个伪造的 Game 实例
 */
export const getMockGame = getMock<Game>(GameMock)
