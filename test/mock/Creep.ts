import { getMockRoom } from './Room'
import { getMock } from './utils'

// 伪造 creep 的默认值
class CreepMock {
    body: BodyPartDefinition[] = [{ type: MOVE, hits: 100 }]
    fatigue: number = 0
    hits: number = 100
    hitsMax: number = 100
    id: Id<this> = `${new Date().getTime()}${Math.random()}` as Id<this>
    memory: CreepMemory = { role: 'harvester' , working: false, spawnRoom: 'W1N1' }
    my: boolean = true
    name: string = `creep${this.id}`
    owner: Owner = { username: 'hopgoldy' }
    room: Room = getMockRoom({ name: 'W1N1' })
    spawning: boolean = false
    saying: string
    store: StoreDefinition
    ticksToLive: number | undefined = 1500
}

/**
 * 伪造一个 creep
 * @param props 该 creep 的属性
 */
export const getMockCreep = getMock<Creep>(CreepMock)
