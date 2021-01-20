/**
 * 房间间资源共享控制器
 * @see doc/资源共享协议设计案.md
 */

import { createGetter } from 'utils'
import RoomShareController from './controller'

/**
 * 所有的控制器都被存放到这里
 */
const controllers: { [roomName: string]: RoomShareController } = {}

/**
 * 向房间原型挂载控制器对象
 * 
 * @param key 要挂载到 Room 的哪个键上
 */
export default function (key: string = 'share') {
    createGetter(Room, key, function () {
        if (!(this.name in controllers)) {
            controllers[this.name] = new RoomShareController(this.name)
        }
        return controllers[this.name]
    })
}