import { getMock } from '../utils'
import { getMockSpawn } from './Spawn'

class SpawningMock {
    directions: DirectionConstant[] = [TOP]
    name = 'mockCreep'
    needTime = 10
    remainingTime = 10
    spawn: StructureSpawn = getMockSpawn();
    cancel = () => {}
    setDirections = () => {}
}

export const getMockSpawning = getMock<Spawning>(SpawningMock)
