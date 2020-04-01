import roles from './role'
/**
 * creep 控制模块
 * 
 * 负责 creep 的新增、删除及修改
 * creep 死后也会由该模块负责回收或再孵化
 * 更多细节 @see creep控制协议设计案.md
 */

 /**
  * creep 的数量控制器
  * 负责发现死去的 creep 并检查其是否需要再次孵化
  */
export default function creepNumberListener(): void {
    for (const name in Memory.creeps) {
        if (name in Game.creeps) continue

        // 如果 creep 已经凉了
        const creepConfig = Memory.creepConfigs[name]
        // 获取配置项
        if (!creepConfig) {
            console.log(`死亡 ${name} 未找到对应 creepConfig, 已删除`)
            delete Memory.creeps[name]
            return
        }

        // 检查指定的 room 中有没有它的生成任务
        const spawnRoom = Game.rooms[creepConfig.spawnRoom]
        if (!spawnRoom) {
            console.log(`死亡 ${name} 未找到 ${creepConfig.spawnRoom}`)
            return
        }

        const creepWork = roles[creepConfig.role](creepConfig.data)

        // 如果有 isNeed 阶段并且该阶段返回 false 则遗弃该 creep
        if (creepWork.isNeed && !creepWork.isNeed(Game.rooms[creepConfig.spawnRoom])) {
            creepApi.remove(name)
            delete Memory.creeps[name]
            return
        }

        // 加入生成，加入成功的话删除过期内存
        if (spawnRoom.addSpawnTask(name) != ERR_NAME_EXISTS) delete Memory.creeps[name]
    }
}


export const creepApi = {
    /**
     * 新增 creep
     * 该方法会自动给对应的房间推送 creep 孵化任务
     * 
     * @param creepName 新增的 creep 名称，如果已存在则会覆盖其配置
     * @param role creep 的角色名称
     * @param data creep 的配置项
     * @param spawnRoom 要孵化到的房间
     * @returns ERR_NOT_FOUND 未找到对应的 creepWork
     * @returns ERR_NOT_OWNER 孵化房间不是自己的或者无法进行孵化
     */
    add(creepName: string, role: CreepRoleConstant, data: CreepData, spawnRoom: string): OK | ERR_NOT_FOUND | ERR_NOT_OWNER {
        if (!Memory.creepConfigs) Memory.creepConfigs = {}
        if (!roles[role]) return ERR_NOT_FOUND

        const creepWork = roles[role](data)
        // 不管有没有直接覆盖掉
        Memory.creepConfigs[creepName] = { role, data, bodys: creepWork.bodys, spawnRoom }
        // 如果已经存在的话就不推送孵化任务了
        if (creepName in Game.creeps) return OK

        // 检测目标房间是否可以进行孵化
        const room = Game.rooms[spawnRoom]
        if (!room) return ERR_NOT_OWNER
        // 推送孵化任务
        room.addSpawnTask(creepName)
        return OK
    },

    /**
     * 查询指定 creep 是否存在配置项
     * 
     * @param creepName 要查询的 creep 名称
     */
    has(creepName: string): boolean {
        return creepName in Memory.creepConfigs
    },

    /**
     * 移除指定 creep 配置项
     * 该方法不会直接杀死对应的 creep。在该 creep 老死后才会因为 找不到配置项而不再继续孵化
     * 
     * @param creepName 要移除的 creep 名称
     * @returns ERR_NOT_FOUND 未找到该 creep
     */
    remove(creepName: string): OK | ERR_NOT_FOUND {
        if (!Memory.creepConfigs || !(creepName in Memory.creepConfigs)) return ERR_NOT_FOUND

        delete Memory.creepConfigs[creepName]
        return OK
    },

    /**
     * 修改配置
     * 修改 creep 的局部配置
     * 
     * @param creepName 要修改配置的 creep 名称
     * @param data 要进行修改的配置
     */
    edit(creepName: string, data: CreepData): OK | ERR_NOT_FOUND {
        if (!Memory.creepConfigs || !(creepName in Memory.creepConfigs)) return ERR_NOT_FOUND
 
        Memory.creepConfigs[creepName].data = _.assign(Memory.creepConfigs[creepName].data, data)
        return OK
    },

    /**
     * 格式化输出所有 creep 配置
     */
    show(): string {
        if (!Memory.creepConfigs) return `暂无 creep 配置`
        // 将 creep 的配置进行格式化
        let format: { [roomName: string]: string[] } = {}
        // 遍历所有配置项并格式化
        for (const creepName in Memory.creepConfigs) {
            const creepConfig = Memory.creepConfigs[creepName]
            // 兜底
            if (!(creepConfig.spawnRoom in format)) format[creepConfig.spawnRoom] = [ `${creepConfig.spawnRoom} 下属 creep：` ]

            format[creepConfig.spawnRoom].push(`  - [${creepName}] [角色] ${creepConfig.role}`)
        }

        let logs = []
        Object.values(format).forEach(roomCreeps => logs.push(...roomCreeps))
        return logs.join('\n')
    }
} 
