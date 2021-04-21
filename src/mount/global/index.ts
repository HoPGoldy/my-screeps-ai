import { showCreep, removeCreep, hasCreep } from '@/modules/creep'
import { clearFlag } from '@/utils'
import comm from './/commodity'
import res from './resourcesHelp'
import help from './help'
import { nuker, cancelNuker as cancelnuker, confirmNuker as confirmnuker } from './nuker'
import ps from './powerSpawn'
import ob from './observer'
import storage from './storage'
import bypass from './bypass'
import reive from './reive'
import whitelist from './whiteList'
import { showRouteChche as route } from '@/modules/move'
import { orderExtend, seeres, hail, base, give } from './common'

// 全局拓展操作
const extensions =  {
    // Game.getObjectById 别名
    get: Game.getObjectById,
    // 挂单别名
    orderExtend,
    // 移除过期旗帜
    clearFlag,
    // 资源查询
    seeres,
    // 欢呼
    hail,
    // 基地查找
    base,
    // 全局发送资源到指定房间
    give,
    // 将 creepApi 挂载到全局方便手动操作
    creep: {
        show: showCreep,
        remove: removeCreep,
        has: hasCreep
    },
    // 绕路模块
    bypass,
    // 掠夺模块
    reive,
    // 白名单
    whitelist,
}

// 全局拓展别名（执行时不需要加后括号）
const alias = {
    // 显示当前商品生产状态
    comm,
    // 常用的资源常量
    res,
    // 全局帮助信息
    help,
    // 显示路径缓存
    route,
    // 挂载 nuker 相关
    nuker, cancelnuker, confirmnuker,
    // 挂载全局建筑状态查看
    ps, ob, storage,
}

// 挂载全局拓展
export default function () {
    // 挂载有别名的操作
    Object.keys(alias).forEach(key => Object.defineProperty(
        global, key, { get: alias[key] }
    ))
    // 挂载没有别名的操作
    _.assign(global, extensions)
}