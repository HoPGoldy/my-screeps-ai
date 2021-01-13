import SourceExtension from './extension'
import { assignPrototype } from 'utils'

/**
 * 挂载 Source 拓展
 */
export default () => assignPrototype(Source, SourceExtension)