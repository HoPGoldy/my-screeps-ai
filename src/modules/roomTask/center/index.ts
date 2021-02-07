/**
 * 房间中央物流任务模块
 * 
 * 该模块处理房间里中央集群的物流任务，包括 factory、terminal、storage、center link 之间的资源流转
 */

import { createGetter } from '@/utils'
import RoomCenterTaskController from './taskController'

/**
 * 所有的房间物流对象都被存放到这里
 */
const controllers: { [roomName: string]: RoomCenterTaskController } = {}

/**
 * 向房间原型挂载物流对象
 * 
 * @param key 要挂载到 Room 的哪个键上
 */
export default function (key: string = 'centerTransport') {
    createGetter(Room, key, function () {
        if (!(this.name in controllers)) {
            controllers[this.name] = new RoomCenterTaskController(this.name)
        }
        return controllers[this.name]
    })
}