import { getSpawn } from '@/mount/room/shortcut'

/**
 * 远程支援单位的 isNeed 阶段
 *
 * @param source 来源房间
 * @param target 被支援的房间
 * @param customCondition 自定义判断条件
 */
export const remoteHelperIsNeed = function (source: Room, target: Room, customCondition: () => boolean): boolean {
    // 源房间没视野就默认孵化
    if (!target) return true

    if (
        // 判断自定义条件
        customCondition() ||
        // 源房间还不够 7 级并且目标房间的 spawn 已经造好了
        (source.controller?.level < 7 && getSpawn(target)?.length > 0)
    ) return false

    return true
}
