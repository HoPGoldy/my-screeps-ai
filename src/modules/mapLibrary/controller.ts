import { AppraisalTypes, LibRoomDetail } from './types'
import { mapLibrary } from './library'
import { getDetailFromStr, getStrFromDetail } from './compression'

/**
 * 获取一个对象的 pos 属性
 */
const getPos = (target: { pos: RoomPosition }): RoomPosition => target.pos

/**
 * 评价该房间
 * 该房间是否有威胁之类的
 * 
 * @param room 要评价的房间
 * @returns 评价等级
 */
const getRoomAppraisal = function (room: Room): AppraisalTypes {
    // 当前的评价跟简单，有玩家就是危险房间
    if (room.controller?.owner) return 'danger'
    return 'safety'
}

/**
 * 记录指定房间
 * 
 * @param room 要扫描的房间
 * @returns 扫描得到的结果
 */
export const recordRoom = function (room: Room): LibRoomDetail {
    // 分类保存房间内的建筑位置
    const groupedStructures = _.groupBy(room.find(FIND_STRUCTURES), ({ structureType }) => structureType)
    const structure = _.forEach(groupedStructures, list => list.map(getPos))

    // 获取房间内所需的信息
    const player = room.controller?.owner.username
    const rcl = room.controller?.level as AllRoomControlLevel
    const controller = room.controller?.pos
    const source = room.find(FIND_SOURCES).map(getPos)
    const mineral = room.find(FIND_MINERALS).map(getPos)
    const site = room.find(FIND_CONSTRUCTION_SITES).map(getPos)

    // 评价房间
    const appraisal = getRoomAppraisal(room)

    const detail: LibRoomDetail = {
        structure, player, rcl, controller, source, mineral, site, appraisal,
        time: Game.time
    }

    // 保存房间信息到全局
    mapLibrary[room.name] = {
        data: detail,
        raw: getStrFromDetail(detail)
    }
    Game._needSaveMapLibrary = true

    return detail
}

/**
 * 移除指定房间的信息
 * 一般用于房间信息过期之后
 * 
 * @param roomName 要清空的房间名
 */
export const clearRoom = function (roomName: string): OK | ERR_NOT_FOUND {
    if (!(roomName in mapLibrary)) return ERR_NOT_FOUND

    delete mapLibrary[roomName]
    Game._needSaveMapLibrary = true
}

/**
 * 获取指定房间的详情数据
 * 
 * @param roomName 要读取的房间名
 * @returns 该房间的数据，如果没有记录过则返回 undefined
 */
export const getDetail = function (roomName: string): LibRoomDetail {
    const mapData = mapLibrary[roomName]
    if (!mapData) return undefined

    const { raw, data } = mapData
    if (data) return data

    // 这里进行了懒加载，只有在请求时才会将房间详情从字符串初始化成对象
    mapLibrary[roomName].data = getDetailFromStr(raw, roomName)
    return mapLibrary[roomName].data
}