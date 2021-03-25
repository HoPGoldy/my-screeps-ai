import { getMock } from './utils'
import { getMockRoom } from './Room'

class SourceMock {
    energy: number = 3000
    energyCapacity: number = 3000
    id: Id<this> = `${new Date().getTime()}${Math.random()}` as Id<this>
    room: Room = getMockRoom()
    ticksToRegeneration: number = 0
}

export const getMockSource = getMock<Source>(SourceMock)