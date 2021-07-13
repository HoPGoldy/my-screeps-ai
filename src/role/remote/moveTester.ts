import { Color } from "@/modulesGlobal/console"

/**
 * 移动测试单位
 * 
 * 一直朝着旗帜移动
 * 添加：creepApi.add('happyCreep0', 'moveTester', { sourceFlagName: 'p' }, 'W49S9')
 * 删除：creepApi.remove('happyCreep0')
 * 
 * @param flagName 目标旗帜名称
 */
const moveTester: CreepConfig<'moveTester'> = {
    prepare: creep => {
        // creep.setWayPoint(data.sourceFlagName)
        // creep.memory.fromShard = Game.shard.name as ShardName
        return true
    },
    target: creep => {
        const { sourceFlagName } = creep.memory.data

        const targetFlag = Game.flags[sourceFlagName]
        if (!targetFlag) {
            creep.log(`找不到 ${sourceFlagName} 旗帜`, Color.Yellow)
            creep.say('旗呢？')
            return false
        }
        // console.log('移动数据', JSON.stringify(creep.memory._go))

        let cost1 = Game.cpu.getUsed()
        const result = creep.goTo(targetFlag.pos, {
            // disableCross: true,
            // checkTarget: true,
            range: 0
        })
        // creep.log(`移动消耗 ${Game.cpu.getUsed() - cost1}`)
        const _go = creep.memory._go
        const path = _go ? (_go.path || '') : ''
        creep.say(`${result.toString()} ${path}`)

        return false
    },
    bodys: () => [ MOVE ]
}

export default moveTester