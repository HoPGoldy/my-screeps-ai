/**
 * 升级者逻辑
 * 
 * source: 从指定矿中挖矿
 * target: 将其转移到指定的 roomController 中
 */

const defaultBodys: BodyPartConstant[] = [ WORK, CARRY, MOVE ]

export default function (sourceId: string, targetId: string, spawnName: string, bodys: BodyPartConstant[] = defaultBodys): ICreepConfig {
   const config: ICreepConfig = {
       source: {
           func: 'getObjectById',
           args: [ sourceId ]
       },
       target: {
           func: 'getObjectById',
           args: [ targetId ]
       },
       spawn: spawnName,
       bodys
   }

   return config
}