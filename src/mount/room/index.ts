import Extension from './extension'
import Console from './console'
import CreepControl from './creepControl'
import mountShortcut from 'modules/shortcut'
import { assignPrototype } from 'utils'

// 定义好挂载顺序
const plugins = [ Extension, Console, CreepControl ]

/**
 * 依次挂载所有的 Room 拓展
 */
export default () => {
    mountShortcut()
    plugins.forEach(plugin => assignPrototype(Room, plugin))
}