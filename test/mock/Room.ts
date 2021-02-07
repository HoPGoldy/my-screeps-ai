export default class RoomMock {
    name = ''
    controller = {}
    energyAvailable = 0
    energyCapacityAvailable = 0
    memory = {}

    constructor(roomName: string) {
        this.name = roomName
    }
}