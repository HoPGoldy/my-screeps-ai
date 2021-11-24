import { createApp } from '@/modulesGlobal/framework'
import { stateScannerAppPlugin } from '@/modulesGlobal/stats'

// 挂载所有的原型拓展
const app = createApp()

// 注册全局资源统计模块
app.on(stateScannerAppPlugin)

// 运行 bot
export const loop = app.run
