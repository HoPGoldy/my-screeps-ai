import RoomPostionCustom from './extension'
import { assignPrototype } from 'utils'

/**
 * 挂载所有的 Room 拓展
 * 挂载顺序为 shortcut > extension > console > creepControl
 */
export default () => {
    assignPrototype(RoomPosition, RoomPostionCustom)
}