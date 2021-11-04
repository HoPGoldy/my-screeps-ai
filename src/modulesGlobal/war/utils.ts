import { getUniqueKey } from "@/utils"
import { getBodyPart } from "./mobilizeManager/getBodyPart"
import { SquadType } from "./squadManager/types"

/**
 * 默认小队代号
 */
export const DEFAULT_SQUAD_CODE = [
    'alpha', 'bravo', 'charlie', 'delta', 'echo', 'foxtrot', 'golf', 'hotel', 'india', 'juliet',
    'kilo', 'mike', 'november', 'oscar', 'papa', 'quebec', 'romeo', 'sierra', 'tango', 'uniform',
    'victor', 'whiskey', 'xray', 'yankee', 'zulu'
]

/**
 * 创建小队孵化信息
 * 
 * @param squadCode 小队代号
 * @param squadType 小队类型
 */
export const createSpawnInfo = function (squadCode: string, squadType: SquadType) {
    const bodys = getBodyPart[squadType]()
    const spawnInfo = {}
    bodys.forEach(body => spawnInfo[squadCode + getUniqueKey()] = body)
    return spawnInfo
}