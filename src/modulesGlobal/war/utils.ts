/**
 * 默认小队代号
 */
export const DEFAULT_SQUAD_CODE = [
    'alpha', 'bravo', 'charlie', 'delta', 'echo', 'foxtrot', 'golf', 'hotel', 'india', 'juliet',
    'kilo', 'mike', 'november', 'oscar', 'papa', 'quebec', 'romeo', 'sierra', 'tango', 'uniform',
    'victor', 'whiskey', 'xray', 'yankee', 'zulu'
]

/**
 * body 和要使用的强化材料
 * 目前只会使用 t3 材料
 */
export const BODY_BOOST_RESOURCES = {
    [WORK]: RESOURCE_CATALYZED_ZYNTHIUM_ACID,
    [ATTACK]: RESOURCE_CATALYZED_UTRIUM_ACID,
    [RANGED_ATTACK]: RESOURCE_CATALYZED_KEANIUM_ALKALIDE,
    [HEAL]: RESOURCE_CATALYZED_LEMERGIUM_ALKALIDE,
    [MOVE]: RESOURCE_CATALYZED_ZYNTHIUM_ALKALIDE,
    [TOUGH]: RESOURCE_CATALYZED_GHODIUM_ALKALIDE
}
