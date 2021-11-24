import { getMock } from './utils'
import { getMockRoom } from './Room'

class SourceMock {
    energy = 3000
    energyCapacity = 3000
    id: Id<this> = `${new Date().getTime()}${Math.random()}` as Id<this>
    room: Room = getMockRoom()
    ticksToRegeneration = 0
}

export const getMockSource = getMock<Source>(SourceMock)
