import { ScreepsServer } from 'screeps-server-mockup'
import LogRecorder from './logRecorder'

/**
 * 全局唯一的 server 实例
 */
let server: ScreepsServer

/**
 * 升级 server 实例
 * 添加更多的事件发射，并添加自动日志记录
 * 
 * @param server 要进行升级的 server 实例
 * @returns 升级后的 server 实例
 */
const upgradeServer = function (server: ScreepsServer) {
    const { tick } = server
    // 发射 tick 开始事件
    server.tick = async function () {
        server.emit('tickStart')
        return tick.apply(this)
    }

    const { reset, addBot } = server.world
    // 发射服务器重置事件
    server.world.reset = async function () {
        server.emit('reset')
        return reset.apply(this)
    }
    // 在添加 bot 时同步启动日志记录实例
    // 会在 server reset 时自动保存并释放
    server.world.addBot = async function (...args) {
        const [ addBotOptions ] = args
        const { username } = addBotOptions

        const bot = await addBot.apply(this, args)
        new LogRecorder(username, server, bot)

        return bot
    }

    return server
}

/**
 * 获取可用的 server 实例
 * @returns server 实例
 */
export const getServer = async function () {
    if (!server) {
        server = upgradeServer(new ScreepsServer())
        await server.start()
    }

    return server
}

/**
 * 重置 server
 */
export const resetServer = async function () {
    if (!server) return
    await server.world.reset()
}

/**
 * 停止 server
 */
export const stopServer = async function () {
    if (!server) return

    // monkey-patch 用于屏蔽 screeps storage 的退出提示
    const error = global.console.error
    global.console.error = (...arg) => !arg[0].match(/Storage connection lost/i) && error.apply(this, arg)

    await server.stop()

}

/**
 * 添加基础房间并设置需要的房间对象
 * 
 * @param targetServer 要进行设置的服务器
 * @param roomName 要添加的房间名称
 */
export const setBaseRoom = async function (targetServer: ScreepsServer, roomName: string = 'W0N1'): Promise<void> {
    await targetServer.world.addRoom(roomName);
    await targetServer.world.addRoomObject(roomName, 'controller', 10, 10, { level: 0 });
    await targetServer.world.addRoomObject(roomName, 'source', 10, 40, {
        energy: 1000, energyCapacity: 1000, ticksToRegeneration: 300
    });
    await targetServer.world.addRoomObject(roomName, 'mineral', 40, 40, {
        mineralType: 'H', density: 3, mineralAmount: 3000
    });
}