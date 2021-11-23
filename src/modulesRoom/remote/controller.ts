import { removeCreep } from '@/modulesGlobal/creep'
import { CreepRole } from '@/role/types/role'
import { RemoteInfo, RemoteShowInfo, RemoteMemory } from './types'
import RoomAccessor from '../RoomAccessor'
import { GetName } from '../spawn/nameGetter'

import { delayQueue } from '@/modulesGlobal/delayQueue'
import { DelayTaskType } from '@/modulesGlobal/delayQueue/types'

export default class RoomShareController extends RoomAccessor<RemoteMemory> {
    constructor (roomName: string) {
        super('roomRemote', roomName, 'remote', undefined)
    }

    /**
     * 获取本房间所有外矿的列表
     */
    get remoteList (): RemoteShowInfo[] {
        if (!this.memory) return []

        return [].concat(...Object.entries(this.memory).map(([remoteRoomName, roomSource]) => {
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
     * @param targetId 能量搬到哪个建筑里
     * @returns ERR_INVALID_TARGET targetId 找不到对应的建筑
     */
    public add (remoteRoomName: string, sourceId: Id<Source>, customTargetId?: Id<StructureWithStore>): Id<StructureWithStore> | ERR_INVALID_TARGET {
        let targetId = customTargetId
        // 没有指定存放外矿能量的建筑，自行挑选
        if (!targetId) {
            const targetStructure = this.selectStore(remoteRoomName)
            if (targetStructure) targetId = targetStructure.id
            else return ERR_INVALID_TARGET
        }

        // target 建筑一定要有
        if (!Game.getObjectById(targetId)) return ERR_INVALID_TARGET

        // 兜底
        if (!this.memory) this.memory = {}

        // 保存外矿信息并发布采集单位
        this.setRemoteInfo(remoteRoomName, sourceId, { targetId })
        this.room.spawner.release.remoteHarvester(remoteRoomName, sourceId)

        return targetId
    }

    /**
     * 判断指定外矿是否被禁用
     *
     * @param remoteRoomName 外矿房间名
     * @param sourceId 采集的外矿 id
     */
    public isDisabled (remoteRoomName: string, sourceId: string): boolean {
        return !!this.memory?.[remoteRoomName]?.[sourceId]?.reharvestTick
    }

    /**
     * 暂时禁止某个外矿采集
     *
     * @param remoteRoomName 要禁用的外矿房间名
     * @param sourceId 要禁止采集的外矿
     * @param disableTick 禁止采集多久
     */
    public disableRemote (remoteRoomName: string, sourceId: Id<Source>, disableTick = 1500) {
        if (this.isDisabled(remoteRoomName, sourceId)) return
        this.setRemoteInfo(remoteRoomName, sourceId, { reharvestTick: Game.time + disableTick })
        // 添加延迟任务
        delayQueue.addDelayTask(DelayTaskType.RemoteHarvest, {
            roomName: this.roomName,
            remoteRoomName,
            sourceId
        }, disableTick)
    }

    /**
     * 重新启用某个外矿
     * @param remoteRoomName 要启用的外矿房间名
     * @param sourceId 要启用的外矿 id
     */
    public enableRemote (remoteRoomName: string, sourceId: Id<Source>) {
        if (!this.isDisabled(remoteRoomName, sourceId)) return
        this.setRemoteInfo(remoteRoomName, sourceId, { reharvestTick: undefined })
    }

    /**
     * 保存外矿信息
     * 包含非空兜底
     */
    private setRemoteInfo (remoteRoomName: string, sourceId: string, info: RemoteInfo) {
        if (!this.memory[remoteRoomName]) this.memory[remoteRoomName] = {}
        if (!this.memory[remoteRoomName][sourceId]) this.memory[remoteRoomName][sourceId] = info
        else {
            this.memory[remoteRoomName][sourceId] = {
                ...this.memory[remoteRoomName][sourceId],
                ...info
            }
        }
    }

    /**
     *
     * @param remoteRoomName 外矿房间名
     * @param sourceId 采集的外矿 id
     * @param ignoreCache 是否无视之前的缓存重新查找存放处
     * @returns 存放建筑
     */
    public getRemoteEnergyStore (remoteRoomName: string, sourceId: string, ignoreCache = false): StructureWithStore {
        const targetStructureId = this.memory?.[remoteRoomName]?.[sourceId]?.targetId

        if (!targetStructureId || ignoreCache) {
            const targetStructure = this.selectStore(remoteRoomName)
            this.setRemoteInfo(remoteRoomName, sourceId, { targetId: targetStructure.id })
            return targetStructure
        }

        return Game.getObjectById(targetStructureId)
    }

    /**
     * 自动选择外矿能量应该存放到的位置
     */
    public selectStore (remoteRoomName: string): StructureWithStore {
        const remotePos = new RoomPosition(25, 25, remoteRoomName)

        // 优先放到最近的 link、storage、terminal 里
        const candidates = [...this.room[STRUCTURE_LINK], this.room.storage, this.room.terminal].filter(Boolean)
        if (candidates.length > 0) {
            return remotePos.findClosestByPath(candidates)
        }

        const containers = this.room[STRUCTURE_CONTAINER]
        // 实在没有就找最近的 container，再没有就别用外矿了
        if (containers && containers.length > 0) {
            return remotePos.findClosestByPath(containers)
        }
    }

    /**
     * 移除外矿
     *
     * @param remoteRoomName 要移除的外矿
     * @param sourceId 要移除的外矿 id
     */
    public remove (remoteRoomName: string, sourceId: Id<Source>): OK | ERR_NOT_FOUND {
        // 兜底
        if (!this.memory) return ERR_NOT_FOUND
        if (!(remoteRoomName in this.memory)) return ERR_NOT_FOUND

        delete this.memory[remoteRoomName]
        if (Object.keys(this.memory).length <= 0) delete this.memory

        // 移除相关单位
        removeCreep(GetName.remoteHarvester(remoteRoomName, sourceId))

        return OK
    }

    /**
     * 占领新房间
     * 本方法只会发布占领单位，等到占领成功后 claimer 会自己发布支援单位
     *
     * @param targetRoomName 要占领的目标房间
     * @param signText 新房间的签名
     */
    public claim (targetRoomName: string, signText = ''): OK {
        this.room.spawner.addTask(
            GetName.claimer(targetRoomName),
            CreepRole.Claimer,
            { targetRoomName, signText }
        )

        return OK
    }
}

delayQueue.addDelayCallback(DelayTaskType.RemoteHarvest, (room, { remoteRoomName, sourceId }) => {
    if (!room) return

    room.remote.enableRemote(remoteRoomName, sourceId)
    room.spawner.release.remoteHarvester(remoteRoomName, sourceId)
})
