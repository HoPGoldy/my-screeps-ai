import { LibRoomDetail } from './types'

/**
 * 分隔符
 */
const SPLIT_POINT = ','

/**
 * 从字符串解析为位置
 *
 * @param str 要进行转换的字符串
 * @param roomName 该位置所在的房间
 * @returns 对应的位置
 */
const getPositionFromStr = function (str: string, roomName: string) {
    const [x, y] = str.split(SPLIT_POINT)
    try {
        return new RoomPosition(Number(x), Number(y), roomName)
    }
    catch (e) {
        return undefined
    }
}

/**
 * 将位置压缩为字符串
 *
 * @param pos 要压缩的位置
 * @returns 压缩后的字符串
 */
const getStrFromPosition = function (pos: RoomPosition) {
    if (!pos) return undefined

    const { x, y } = pos
    return `${x}${SPLIT_POINT}${y}`
}

/**
 * 从字符串还原房间信息
 *
 * @param rawStr 压缩后的房间信息
 * @param roomName 该信息对应的房间名
 * @returns 对应的房间信息
 */
export const getDetailFromStr = function (rawStr: string, roomName: string): LibRoomDetail {
    const rawData: LibRoomDetail<string> = JSON.parse(rawStr)

    const correctData: LibRoomDetail = {
        ...rawData,
        source: rawData.source.map(str => getPositionFromStr(str, roomName)),
        mineral: rawData.mineral.map(str => getPositionFromStr(str, roomName)),
        site: rawData.site.map(str => getPositionFromStr(str, roomName)),
        controller: getPositionFromStr(rawData.controller, roomName),
        structure: _.forEach(rawData.structure, list => list.map(str => getPositionFromStr(str, roomName)))
    }

    return correctData
}

/**
 * 将房间信息压缩为字符串
 *
 * @param detail 要压缩的房间信息
 * @returns 压缩后的字符串
 */
export const getStrFromDetail = function (detail: LibRoomDetail): string {
    // 这里会把位置进行压缩以减少所需空间
    const rawData: LibRoomDetail<string> = {
        ...detail,
        source: detail.source.map(getStrFromPosition),
        mineral: detail.mineral.map(getStrFromPosition),
        site: detail.site.map(getStrFromPosition),
        controller: getStrFromPosition(detail.controller),
        structure: _.forEach(detail.structure, list => list.map(getStrFromPosition))
    }

    return JSON.stringify(rawData)
}
