import { getMock } from './utils'
import { getMockVisual } from './RoomVisual'

// 伪造 room 的默认值
class RoomMock {
    name = ''
    controller = {}
    energyAvailable = 0
    energyCapacityAvailable = 0
    memory = {}
    visual = getMockVisual()
}

/**
 * 伪造一个 room
 * @param props 该房间的属性
 */
export const getMockRoom = getMock<Room>(RoomMock)