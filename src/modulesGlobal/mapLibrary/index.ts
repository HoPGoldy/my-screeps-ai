import { AppLifecycleCallbacks } from '../framework/types'
import { initMapLibrary, saveMapLibrary } from './library'
export { recordRoom, clearRoom, getDetail } from './controller'

initMapLibrary()

/**
 * 地图库注册插件
 */
export const mapLibraryAppPlugin: AppLifecycleCallbacks = {
    tickEnd: () => Game._needSaveMapLibrary && saveMapLibrary()
}
