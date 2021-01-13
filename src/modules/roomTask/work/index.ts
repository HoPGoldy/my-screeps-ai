/**
 * 房间物流任务模块
 * 
 * 该模块处理房间中的物流任务，包括：spawn、extension、tower 能量填充，lab 运输等等
 * 但是该模块不负责中央集群的物流任务
 */

import { createGetter } from 'utils'
import RoomWork from './taskController'

/**
 * 所有的房间物流对象都被存放到这里
 */
const workControllers: { [roomName: string]: RoomWork } = {}

/**
 * 向房间原型挂载物流对象
 * 
 * @param key 要挂载到 Room 的哪个键上
 */
export default function (key: string = 'work') {
    createGetter(Room, key, () => {
        if (!(this.name in workControllers)) {
            workControllers[this.name] = new RoomWork(this.name)
        }
        return workControllers[this.name]
    })
}