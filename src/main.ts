import mountWork from './mount'
import { creepNumberController, doing } from './utils'
import { Visualizer } from './Visualizer'

module.exports.loop = function (): void {
    // console.log(`-------------------------- [${Game.time}] ----`)
    
    // 挂载所有拓展
    mountWork()

    // 数量控制
    creepNumberController()

    // let cost1 = Game.cpu.getUsed()
    // 所有建筑工作
    doing(Game.structures)
    // let cost2 = Game.cpu.getUsed()
    // console.log(`[建筑消耗] ${cost2 - cost1}`)

    // 所有 creep 工作
    doing(Game.creeps)
    // cost1 = Game.cpu.getUsed()
    // console.log(`[creep消耗] ${cost1 - cost2}`)
    
    for(const powerCreep in Game.powerCreeps)
    {
        const creep=Game.powerCreeps[powerCreep]
        const ps:StructurePowerSpawn=Game.getObjectById(Game.rooms['E14N43'].memory.powerSpawn.id)
        if(!creep.room)
        {
            if(ps)
            {
                creep.spawn(ps)
            }
        }
        else
        {
            if(!creep.room.controller.isPowerEnabled)
            {
                if(creep.enableRoom(creep.room.controller)==ERR_NOT_IN_RANGE)
                {
                    creep.moveTo(creep.room.controller)
                }
            }
            else
            {
                if(creep.ticksToLive<=100)
                {
                    if(creep.renew(ps)==ERR_NOT_IN_RANGE)
                    {
                        creep.moveTo(ps)
                    }
                }
                else
                {
                    if(creep.store.getUsedCapacity()==creep.store.getCapacity())
                    {
                        if(creep.withdraw(creep.room.terminal,RESOURCE_OPS)==ERR_NOT_IN_RANGE)
                        {
                            creep.moveTo(creep.room.terminal)
                        }
                    }
                    else
                    {
                        if(creep.powers[PWR_GENERATE_OPS].cooldown==0)
                        {
                            creep.usePower(PWR_GENERATE_OPS)
                        }
                        if(creep.pos!=Game.flags['parking'].pos)
                        {
                            creep.moveTo(Game.flags['parking'])
                        }
                    }
                }
            }
        }
    }
    Visualizer.visuals()
}