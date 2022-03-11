import { setCreepStand } from '@/modulesGlobal/move'
import { isCreepStand } from '@/modulesGlobal/move/crossRules'

/**
 * 挂载 creep 拓展
 */
export const mountCreep = () => standWrapper(['harvest', 'build', 'dismantle', 'repair', 'upgradeController'])

/**
 * 给指定方法包装“站定”功能
 *
 * 站定是指 creep 停在原地开始进行工作，例如：开始升级控制器，开始刷墙，开始建造建筑...
 * 而这个功能的目的是用于判断是否可以对穿，在 stand == true 时，creep 开始工作，此时是不允许其他同类型的 creep 进行对穿的
 * stand 会在阶段切换时（target > source）被其他方法清除
 *
 * @param funcNames 要进行包装的方法名
 */
const standWrapper = function (funcNames: string[]) {
    funcNames.forEach(funcName => {
        const originFuncName = '_' + funcName

        // 保存原始方法
        Creep.prototype[originFuncName] = Creep.prototype[funcName]
        // 进行 wrapper
        Creep.prototype[funcName] = function (...args) {
            const result = this[originFuncName](...args)
            // 如果刚开始工作，就设置为站定状态
            if (result === OK && !isCreepStand(this.name)) {
                setCreepStand(this.name, true)
                // 站定后移除可能剩余的路径缓存，不然可能出现目标换了但是还是按照之前的路径走的问题
                delete this.memory._go
            }
            return result
        }
    })
}
