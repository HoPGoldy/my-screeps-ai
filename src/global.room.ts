import scan from './room.rader'
import towerWork from './room.tower'
import { getRoomList } from './utils'

/**
 * 房间控制
 * 执行每个房间的任务
 */
export default function (): void {
    // 遍历每一个可控制房间
    for (const roomName of getRoomList()) {
        // 获取 room 并检查内存是否正确
        const room: Room = Game.rooms[roomName]
        if (!(roomName in Memory)) initRoom(room)

        // 执行房间内的工作
        scan(room)
        towerWork(room)
    }
}

/**
 * 房间初始化
 * 初始化房间的 Memory ，包括矿注册表以及雷达扫描结果
 * 
 * @param room 房间名称
 */
function initRoom (room: Room): void {
    // 将其存入内容
    Memory[room.name] = {
        // 雷达扫描结果
        radarResult: {}
    }
}