import { Color } from '../console'

export const runPowerCreep = function (pc: PowerCreep): void {
    if (!keepAlive(pc)) return
    // 上班了！执行房间 power 任务
    pc.room.power.runManager(pc)
}

/**
 * 保证自己一直活着
 *
 * @returns 是否可以执行后面的工作
 */
const keepAlive = function (pc: PowerCreep): boolean {
    // 离死还早，继续工作
    if (pc.ticksToLive > 100) return true

    // 快凉了就尝试重生
    if (pc.ticksToLive <= 100) {
        // 如果工作房间被更改的话就不进行 renew
        // 等到冷却完成后会自动复活到 workRoom
        if (pc.memory.workRoom !== pc.room.name) return true

        pc.say('插座在哪！')
        if (pc.room.power.renew(pc) === OK) return false
    }

    // 执行到这里就说明是真凉了，如果在冷却的话就等着
    if (pc.spawnCooldownTime) return false

    // 请求指定工作房间
    if (!pc.memory.workRoom) {
        pc.log(`请使用该命令来指定工作房间（房间名置空以关闭提示）：Game.powerCreeps['${pc.name}'].setWorkRoom('roomname')`)
        return false
    }

    // 可以复活了
    if (pc.memory.workRoom !== 'hideTip') spawnAtRoom(pc, pc.memory.workRoom)
    return false
}

/**
 * 在指定房间重生自己
 *
 * @param roomName 要生成到的房间名
 * @returns OK 生成成功
 * @returns ERR_INVALID_ARGS 该房间没有视野
 * @returns ERR_NOT_FOUND 该房间不存在或者其中没有 PowerSpawn
 */
const spawnAtRoom = function (pc: PowerCreep, roomName: string): OK | ERR_INVALID_ARGS | ERR_NOT_FOUND {
    const targetRoom = Game.rooms[roomName]
    if (!targetRoom || !targetRoom.powerSpawn) {
        pc.log('找不到指定房间或者房间内没有 powerSpawn，请重新指定工作房间')
        return ERR_NOT_FOUND
    }

    const spawnResult = pc.spawn(targetRoom.powerSpawn)

    if (spawnResult === OK) {
        targetRoom.power.addSkill(pc)
        return OK
    }
    else {
        pc.log(`孵化异常! 错误码: ${spawnResult}`, Color.Yellow)
        return ERR_INVALID_ARGS
    }
}
