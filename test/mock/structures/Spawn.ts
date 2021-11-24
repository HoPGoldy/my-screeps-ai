import { StructureMock } from './Structure'
import { getMock } from '../utils'

class StructureSpawnMock extends StructureMock {
    memory = {}
    name = 'mockSpawn'
    spawning: Spawning | null;
    store: Store<RESOURCE_ENERGY, false>;
    spawnCreep = () => {}
    renewCreep = () => {}
    recycleCreep = () => {}

    constructor () {
        super(STRUCTURE_SPAWN)
    }
}

export const getMockSpawn = getMock<StructureSpawn>(StructureSpawnMock)
