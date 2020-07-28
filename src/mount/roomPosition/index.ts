import RoomPostionExtension from './extension'
import { assignPrototype } from 'utils'

/**
 * 挂载 RoomPosition 拓展
 */
export default () => assignPrototype(RoomPosition, RoomPostionExtension)