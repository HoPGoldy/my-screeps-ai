import {
    createApp,
    stateScannerAppPlugin,
    crossShardAppPlugin
} from './modulesGlobal'
import { generatePixelAppPlugin } from './utils'
import { createGlobalExtension, roomRunner } from './mount'
import { constructionAppPlugin } from './mount/global/construction'
import { delayQueueAppPlugin } from './mount/global/delayQueue'
import { warAppPlugin } from './mount/global/war'
import { powerAppPlugin } from './mount/room/power'

// 设置运行器
const app = createApp({ roomRunner })

// 挂载全部拓展
app.on(createGlobalExtension())

// 注册跨 shard 模块
app.on(crossShardAppPlugin)

// 注册建筑管理模块
app.on(constructionAppPlugin)

// 注册延迟任务管理模块
app.on(delayQueueAppPlugin)

// 注册 powerCreep 管理模块
app.on(powerAppPlugin)

// 注册全局战争运行模块
app.on(warAppPlugin)

// 注册搓 pixel 任务
app.on(generatePixelAppPlugin)

// 注册全局资源统计模块
app.on(stateScannerAppPlugin)

export const loop = app.run
