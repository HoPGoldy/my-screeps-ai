import mountWork from './mount'

import { clearDiedCreep, syncCreepConfig, doing } from './utils'

module.exports.loop = function (): void {
    // 挂载所有拓展
    mountWork()

    // 清除死亡 creep 记忆
    clearDiedCreep()
    
    // 定期同步 creep 配置
    syncCreepConfig()

    // 所有建筑干活
    doing(Game.structures)

    // 所有 creep 干活
    doing(Game.creeps)


    const source: RoomPosition = new RoomPosition(27, 12, 'W3N6')

    const creep = Game.creeps['test']
    // creep.moveTo(30, 18)

    if (creep) {
        let path: RoomPosition[]
        if (creep.memory.path) {
            path = creep.memory.path
        }
        else {
            path = PathFinder.search(creep.pos, source, {
                roomCallback: function(roomName) {
                    let room = Game.rooms[roomName]
                    if (!room) return
                    let costs = new PathFinder.CostMatrix;
            
                    room.find(FIND_STRUCTURES).forEach(struct => {
                        if (struct.structureType === STRUCTURE_ROAD) {
                            costs.set(struct.pos.x, struct.pos.y, 1)
                        } 
                        else if (struct.structureType !== STRUCTURE_CONTAINER && (struct.structureType !== STRUCTURE_RAMPART || !struct.my)) {
                            costs.set(struct.pos.x, struct.pos.y, 255);
                        }
                    })
            
                    return costs
                }
            }).path

            creep.memory.path = path
        }
        console.log(creep.moveByPath(path))
    }
}