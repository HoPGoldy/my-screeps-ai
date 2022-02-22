import { createCache } from '@/utils'
import { useClaimer } from './hooks/useClaimer'
import { getRemoteHarvesterName, useRemoteHarvester } from './hooks/useRemoteHarvester'
import { useRemoteHelper } from './hooks/useRemoteHelper'
import { useReserver } from './hooks/useReserver'
import { useSigner } from './hooks/useSigner'
import { RemoteContext, DelayRemoteHarvestData, RemoteShowInfo, RemoteConfig } from './types'

/**
 * 创建扩展管理模块
 */
export const createRemoteController = function (context: RemoteContext) {
    const { getMemory, withDelayCallback, getLink, getContainer, env } = context

    const lazyLoader = function (roomName: string) {
        /**
         * 获取本房间所有外矿的列表
         */
        const getRemoteList = function (): RemoteShowInfo[] {
            const room = env.getRoomByName(roomName)
            const { config } = getMemory(room)
            if (!config) return []

            return [].concat(...Object.entries(config).map(([remoteRoomName, roomSource]) => {
                return Object.entries(roomSource).map(([sourceId, sourceInfo]) => ({
                    ...sourceInfo,
                    sourceId,
                    remoteRoomName
                }))
            }))
        }

        /**
         * 拓展新的外矿
         *
         * @param remoteRoomName 要拓展的外矿房间名
         * @param sourceId 要采集的外矿 source id
         * @param customTargetId 能量搬到哪个建筑里，不指定则自行挑选
         * @returns ERR_INVALID_TARGET targetId 找不到对应的建筑
         */
        const add = function (
            remoteRoomName: string,
            sourceId: Id<Source>,
            customTargetId?: Id<AnyStoreStructure>
        ): Id<AnyStoreStructure> | ERR_INVALID_TARGET {
            let targetId = customTargetId
            // 没有指定存放外矿能量的建筑，自行挑选
            if (!targetId) {
                const targetStructure = selectStore(remoteRoomName)
                if (targetStructure) targetId = targetStructure.id
                else return ERR_INVALID_TARGET
            }

            // target 建筑一定要有
            if (!env.getObjectById(targetId)) return ERR_INVALID_TARGET

            const room = env.getRoomByName(roomName)
            const memory = getMemory(room)

            // 兜底
            if (!memory.config) memory.config = {}

            // 保存外矿信息并发布采集单位
            setRemoteInfo(remoteRoomName, sourceId, { targetId })
            releaseRemoteHarvester(room, remoteRoomName, sourceId)

            return targetId
        }

        /**
         * 判断指定外矿是否被禁用
         *
         * @param remoteRoomName 外矿房间名
         * @param sourceId 采集的外矿 id
         */
        const isDisabled = function (remoteRoomName: string, sourceId: string): boolean {
            const room = env.getRoomByName(roomName)
            const memory = getMemory(room)

            return !!memory?.config?.[remoteRoomName]?.[sourceId]?.reharvestTick
        }

        /**
         * 暂时禁止某个外矿采集
         *
         * @param remote 要禁用的外矿房间名
         * @param sourceId 要禁止采集的外矿
         * @param disableTick 禁止采集多久
         */
        const disableRemote = function (remote: string, sourceId: Id<Source>, disableTick = 1500) {
            if (isDisabled(remote, sourceId)) return
            setRemoteInfo(remote, sourceId, { reharvestTick: Game.time + disableTick })
            // 添加延迟启动任务
            delayAddHarvester({ roomName, remote, sourceId }, disableTick)
        }

        /**
         * 重新启用某个外矿
         * @param remoteRoomName 要启用的外矿房间名
         * @param sourceId 要启用的外矿 id
         */
        const enableRemote = function (remoteRoomName: string, sourceId: Id<Source>) {
            if (!isDisabled(remoteRoomName, sourceId)) return
            setRemoteInfo(remoteRoomName, sourceId, { reharvestTick: undefined })
        }

        /**
         * 保存外矿信息
         * 包含非空兜底
         */
        const setRemoteInfo = function (remoteRoomName: string, sourceId: string, info: RemoteConfig) {
            const room = env.getRoomByName(roomName)
            const memory = getMemory(room)

            if (!memory.config) memory.config = {}

            if (!memory.config[remoteRoomName]) memory.config[remoteRoomName] = {}
            if (!memory.config[remoteRoomName][sourceId]) memory.config[remoteRoomName][sourceId] = info
            else {
                memory.config[remoteRoomName][sourceId] = {
                    ...memory.config[remoteRoomName][sourceId],
                    ...info
                }
            }
        }

        /**
         * 获取指定外矿的能量存放位置
         *
         * @param remoteRoomName 外矿房间名
         * @param sourceId 采集的外矿 id
         * @param ignoreCache 是否无视之前的缓存重新查找存放处
         * @returns 存放建筑
         */
        const getRemoteEnergyStore = function (remoteRoomName: string, sourceId: string, ignoreCache = false): AnyStoreStructure {
            const room = env.getRoomByName(roomName)
            const memory = getMemory(room)

            const targetStructureId = memory?.config?.[remoteRoomName]?.[sourceId]?.targetId

            if (!targetStructureId || ignoreCache) {
                const targetStructure = selectStore(remoteRoomName)
                setRemoteInfo(remoteRoomName, sourceId, { targetId: targetStructure.id })
                return targetStructure
            }

            return env.getObjectById(targetStructureId)
        }

        /**
         * 自动选择外矿能量应该存放到的位置
         */
        const selectStore = function (remoteRoomName: string): AnyStoreStructure {
            const remotePos = new RoomPosition(25, 25, remoteRoomName)
            const selfRoom = env.getRoomByName(roomName)

            // 优先放到最近的 link、storage、terminal 里
            const candidates = [...getLink(selfRoom), selfRoom.storage, selfRoom.terminal].filter(Boolean)
            if (candidates.length > 0) {
                return remotePos.findClosestByPath(candidates)
            }

            const containers = getContainer(selfRoom)
            // 实在没有就找最近的 container，再没有就别用外矿了
            if (containers && containers.length > 0) {
                return remotePos.findClosestByPath(containers)
            }
        }

        /**
         * 移除外矿
         *
         * @param remoteRoomName 要移除的外矿
         */
        const remove = function (remoteRoomName: string): OK | ERR_NOT_FOUND {
            const room = env.getRoomByName(roomName)
            const memory = getMemory(room)

            // 兜底
            if (!memory.config) return ERR_NOT_FOUND
            if (!(remoteRoomName in memory.config)) return ERR_NOT_FOUND

            // 移除相关单位
            Object.keys(memory.config[remoteRoomName]).forEach((sourceId: Id<Source>) => {
                const harvesterName = getRemoteHarvesterName(remoteRoomName, sourceId)
                remoteHarvester.removeUnit(room, harvesterName, { immediate: true })
            })
            // 移除相关内存数据
            delete memory.config[remoteRoomName]
            if (Object.keys(memory).length <= 0) delete memory.config

            return OK
        }

        /**
         * 占领新房间
         * 本方法只会发布占领单位，等到占领成功后 claimer 会自己发布支援单位
         *
         * @param targetRoomName 要占领的目标房间
         * @param signText 新房间的签名
         * @param centerFlagName 新房的基地中心位置旗帜名
         */
        const claim = function (targetRoomName: string, signText?: string, centerFlagName?: string): OK {
            releaseClaimer(env.getRoomByName(roomName), targetRoomName, signText, centerFlagName)
            return OK
        }

        /**
         * 给指定房间控制器签名
         *
         * @param signText 要签名的内容
         * @param targetRoomName 要签名的房间（默认为本房间）
         */
        const sign = function (signText: string, targetRoomName?: string) {
            releaseSigner(env.getRoomByName(roomName), targetRoomName || roomName, signText)
            return OK
        }

        /**
         * 【入口】执行扩张模块逻辑
         */
        const run = function () {
            const workRoom = env.getRoomByName(roomName)

            remoteHarvester.run(workRoom)
            reserver.run(workRoom)
            remoteHelper.run(workRoom)
            claimer.run(workRoom)
            signer.run(workRoom)
        }

        return { run, getRemoteList, add, remove, claim, sign, getRemoteEnergyStore, isDisabled, disableRemote, enableRemote }
    }

    const [getRemoteController] = createCache(lazyLoader)
    const getController = room => getRemoteController(room.name)
    // 创建预定单位
    const { reserver, releaseReserver } = useReserver(context)
    // 创建外矿采集单位
    const { remoteHarvester, releaseRemoteHarvester } = useRemoteHarvester(context, getController, releaseReserver)
    // 创建支援单位
    const { remoteHelper, releaseRemoteHelper } = useRemoteHelper(context)
    // 创建占领单位
    const { claimer, releaseClaimer } = useClaimer(context, releaseRemoteHelper)
    // 创建签名单位
    const { signer, releaseSigner } = useSigner(context)

    /**
     * 添加外矿被禁用后的恢复采集任务
     */
    const delayAddHarvester = withDelayCallback('remoteHarvest', ({ roomName, remote, sourceId }: DelayRemoteHarvestData) => {
        const thisRoom = env.getRoomByName(roomName)
        if (!thisRoom) return

        const { enableRemote } = getRemoteController(roomName)
        enableRemote(remote, sourceId)
        releaseRemoteHarvester(thisRoom, remote, sourceId)
    })

    return getRemoteController
}

export type RemoteController = ReturnType<ReturnType<typeof createRemoteController>>
