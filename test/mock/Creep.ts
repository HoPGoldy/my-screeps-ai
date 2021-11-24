import { getMockRoom } from './Room'
import { getMock } from './utils'

// 伪造 creep 的默认值
class CreepMock {
    body: BodyPartDefinition[] = [{ type: MOVE, hits: 100 }]
    fatigue = 0
    hits = 100
    hitsMax = 100
    id: Id<this> = `${new Date().getTime()}${Math.random()}` as Id<this>
    memory = { role: 'harvester', working: false, spawnRoom: 'W1N1' } as CreepMemory
    my = true
    name = `creep${this.id}`
    owner: Owner = { username: 'hopgoldy' }
    room: Room = getMockRoom({ name: 'W1N1' })
    spawning = false
    saying: string
    store: StoreDefinition
    ticksToLive: number | undefined = 1500
}

/**
 * 伪造一个 creep
 * @param props 该 creep 的属性
 */
export const getMockCreep = getMock<Creep>(CreepMock)
