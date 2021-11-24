import { getMockRoom } from '../Room'

export class StructureMock {
    hits = 1000
    hitsMax = 1000
    id = `${new Date().getTime()}${Math.random()}`
    room = getMockRoom()
    structureType = 'controller'
    destroy = () => {}
    isActive = () => true
    notifyWhenAttacked = () => {}

    constructor (structureType: StructureConstant) {
        this.structureType = structureType
    }
}
