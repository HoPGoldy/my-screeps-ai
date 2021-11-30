import { withDelayCallback } from '@/mount/global/delayQueue'
import { MapLibrary } from './types'

const RAW_MEMORY_ID = 1

/**
 * cost 数据储存位置
 * 会在全局重置时从 RawMemory 同步过来
 */
export let mapLibrary: MapLibrary = {}

/**
 * map 库初始化回调
 */
const delayInitMapLibrary = withDelayCallback('mapLibraryInit', () => {
    if (!(RAW_MEMORY_ID in RawMemory.segments)) return initMapLibrary()

    const data = RawMemory.segments[RAW_MEMORY_ID]
    mapLibrary = JSON.parse(data || '{}')
})

/**
 * map 库保存回调
 * 由于肯定会经历全量 JSON 压缩，所以这里不用特别指定要保存哪个房间的数据
 */
const delaySaveMapLibrary = withDelayCallback('mapLibrarySave', () => {
    if (!(RAW_MEMORY_ID in RawMemory.segments)) return saveMapLibrary()

    // 复制 map 库，只需要保存 raw 原始数据
    const stringifyLibrary: MapLibrary = {}
    for (const roomName in mapLibrary) {
        stringifyLibrary[roomName] = { raw: mapLibrary[roomName].raw }
    }

    RawMemory.segments[RAW_MEMORY_ID] = JSON.stringify(stringifyLibrary)
})

/**
 * 添加 map 库初始化任务
 */
export const initMapLibrary = function () {
    RawMemory.setActiveSegments([RAW_MEMORY_ID])
    delayInitMapLibrary({ }, 1)
}

/**
 * 添加 map 库保存任务
 */
export const saveMapLibrary = function () {
    RawMemory.setActiveSegments([RAW_MEMORY_ID])
    delaySaveMapLibrary({ }, 1)
}
