import { getMock } from '../utils'
import { getMockSpawn } from './Spawn';

class SpawningMock {
    directions: DirectionConstant[] = [TOP]
    name: string = 'mockCreep'
    needTime: number = 10
    remainingTime: number = 10
    spawn: StructureSpawn = getMockSpawn();
    cancel = () => {}
    setDirections = () => {}
}

export const getMockSpawning = getMock<Spawning>(SpawningMock)
