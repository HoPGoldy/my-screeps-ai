import mountCreep from './mount.creep'
import mountGlobal from './mount.global'

/**
 * 挂载所有的额外属性和方法
 */
export default function (): void {
    if (!global.hasExtension) {
        global.hasExtension = true
        mountCreep()
        mountGlobal()
    }
}