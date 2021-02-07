/**
 * 房间物流任务模块
 * 
 * 该模块处理房间中的物流任务，包括：spawn、extension、tower 能量填充，lab 运输等等
 * 但是该模块不负责中央集群的物流任务
 */

import { createGetter } from '@/utils'
import RoomTransport from './taskController'

/**
 * 所有的房间物流对象都被存放到这里
 */
const transportControllers: { [roomName: string]: RoomTransport } = {}

/**
 * 向房间原型挂载物流对象
 * 
 * @param key 要挂载到 Room 的哪个键上
 */
export default function (key: string = 'transport') {
    createGetter(Room, key, function () {
        if (!(this.name in transportControllers)) {
            transportControllers[this.name] = new RoomTransport(this.name)
        }
        return transportControllers[this.name]
    })
}