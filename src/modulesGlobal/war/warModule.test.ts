import { getMockCreep, getMockRoom, mockGetObjectById } from '@test/mock'
import { createWarModule } from './warModule'

const mockMemory = {
    wars: {}
}

const effects = {
    getMemory: () => mockMemory,
    getRoomByName: name => getMockRoom({ name }),
    getCreepByName: name => getMockCreep({ name}),
    getObjectById: mockGetObjectById([])
}

// const warModule = createWarModule(effects)