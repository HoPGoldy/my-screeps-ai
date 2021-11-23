import { initMapLibrary, saveMapLibrary } from './library'
export { recordRoom, clearRoom, getDetail } from './controller'

/**
 * 地图库注册插件
 */
export const mapLibraryAppPlugin: AppLifecycleCallbacks = {
    reset: initMapLibrary,
    tickEnd: () => Game._needSaveMapLibrary && saveMapLibrary()
}
