import { showCreep, removeCreep, hasCreep } from '@/modulesGlobal/creep'
import { clearFlag } from '@/utils'
import { showGlobal as comm } from '../room/factory'
import res from './resourcesHelp'
import help from './help'
import { globalShowObserver as ob } from '../room/observer'
import { consoleWarModule } from './war'
import { showStorageAmountOverview } from '@/modulesRoom/storage/utils'
import bypass from './bypass'
import reive from './reive'
import whitelist from './whiteList'
import { showRouteChche as route } from '@/modulesGlobal/move'
import { cpu, orderExtend, seeres, hail, base, give, roomAlias, ps } from './common'

import { getForm as getform } from '@/utils/console/form/example'
import { updateCreepData } from '@/modulesGlobal/creep/utils'
import { showResourceSource } from '@/modulesRoom/share/utils'
import { mountNuker } from '../room/nuker'
import { mountConstruct } from './construction'

// 全局拓展操作
const extensions = {
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
    // 显示 cpu 消耗
    cpu,
    // 战争管理模块
    war: consoleWarModule,
    // 将 creepApi 挂载到全局方便手动操作
    creep: {
        show: showCreep,
        remove: removeCreep,
        has: hasCreep,
        update: updateCreepData
    },
    // 绕路模块
    bypass,
    // 掠夺模块
    reive,
    // 白名单
    whitelist
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
    // 挂载全局建筑状态查看
    ps,
    ob,
    // 所有房间的存储容量查看
    storage: showStorageAmountOverview,
    // 控制台表单示例
    getform,
    // 资源共享注册房间
    share: showResourceSource,
    // 全局手操房间快捷访问
    ...roomAlias
}

// 挂载全局拓展
export default function () {
    // 挂载有别名的操作
    Object.keys(alias).forEach(key => Object.defineProperty(
        global, key, { get: alias[key] }
    ))
    // 挂载没有别名的操作
    _.assign(global, extensions)

    mountNuker()
    mountConstruct()
}
