export { recordRoom, clearRoom, getDetail } from './controller'
import { initMapLibrary, saveMapLibrary } from './library'

/**
 * 地图库注册插件
 */
export const mapLibraryAppPlugin: AppLifecycleCallbacks = {
    reset: initMapLibrary,
    tickEnd: () => Game._needSaveMapLibrary && saveMapLibrary()
}