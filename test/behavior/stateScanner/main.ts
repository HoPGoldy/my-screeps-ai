import App from '@/modulesGlobal/framework'
import { errorMapper } from '@/modulesGlobal/errorMapper'
import { stateScannerAppPlugin } from '@/modulesGlobal/stats'

// 挂载所有的原型拓展
const app = new App()

// 使用 sourceMap 校正报错信息
app.catcher = errorMapper

// 注册全局资源统计模块
app.on(stateScannerAppPlugin)

// 运行 bot
export const loop = () => app.run()