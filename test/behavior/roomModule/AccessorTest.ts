import RoomAccessor from '@/modules/room/RoomAccessor'

type MemoryType = number[]

export default class RoomShareController extends RoomAccessor<MemoryType> {
    constructor(roomName: string) {
        super('accessorTest', roomName, 'accessorTest', []) 
    }

    clear() {
        this.memory = undefined
    }

    init() {
        this.memory = [1,2,3]
    }

    add() {
        this.memory.push(1)
    }

    show() {
        console.log('show', JSON.stringify(this.memory))
    }
}