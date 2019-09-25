import mountCreep from './mount.creep'
import mountGlobal from './mount.global'
import mountFlag from './mount.flag'
import mountTower from './mount.tower'

/**
 * 挂载所有的额外属性和方法
 */
export default function (): void {
    if (!global.hasExtension) {
        console.log('[mount] 重新挂载拓展')
        global.hasExtension = true
        mountGlobal()
        mountCreep()
        mountFlag()
        mountTower()
    }
}