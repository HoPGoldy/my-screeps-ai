import Shortcut from './shortcut'
import Extension from './extension'
import Console from './console'
import CreepControl from './creepControl'
import { assignPrototype } from 'utils'

// 定义好挂载顺序
const plugins = [ Shortcut, Extension, Console, CreepControl]

/**
 * 依次挂载所有的 Room 拓展
 */
export default () => plugins.forEach(plugin => assignPrototype(Room, plugin))