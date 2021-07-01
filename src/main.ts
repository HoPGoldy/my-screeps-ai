import App from './modules/framework'
import { errorMapper } from './modules/errorMapper'
import { generatePixelAppPlugin } from './utils'
import { stateScannerAppPlugin } from './modules/stats'
import { creepNumberControlAppPlugin } from './modules/creep'
import { crossShardAppPlugin } from './modules/crossShard'
import { delayQueueAppPlugin } from './modules/delayQueue'
import { constructionAppPlugin } from './modules/constructionController'
import { mapLibraryAppPlugin } from './modules/mapLibrary'
import { mountList, extensionAppPlugin } from './mount'

// 挂载所有的原型拓展
const app = new App({ mountList })

// 使用 sourceMap 校正报错信息
app.catcher = errorMapper

// 暂时禁用内存缓存
app.memoryCacher = null

// 注册主拓展模块
app.on(extensionAppPlugin)

// 注册跨 shard 模块
app.on(crossShardAppPlugin)

// 注册 creep 数量控制
app.on(creepNumberControlAppPlugin)

// 注册建筑管理模块
app.on(constructionAppPlugin)

// 注册延迟任务管理模块
app.on(delayQueueAppPlugin)

// 注册地图库插件
app.on(mapLibraryAppPlugin)

// 注册搓 pixel 任务
app.on(generatePixelAppPlugin)

// 注册全局资源统计模块
app.on(stateScannerAppPlugin)

// 运行 bot
export const loop = () => app.run()
