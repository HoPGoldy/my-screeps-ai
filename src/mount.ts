import mountCreep from './mount.creep'
import mountGlobal from './mount.global'
import mountTower from './mount.tower'
import mountLink from './mount.link'
import mountSpawn from './mount.spawn'
import { syncCreepConfig } from './utils'

/**
 * 挂载所有的额外属性和方法
 */
export default function (): void {
    if (!global.hasExtension) {
        console.log('[mount] 重新挂载拓展')
        global.hasExtension = true
        // 重新同步 creep 配置
        syncCreepConfig()
        // 挂载全部拓展
        mountGlobal()
        mountCreep()
        mountTower()
        mountSpawn()
        mountLink()
    }
}