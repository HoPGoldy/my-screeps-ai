/**
 * 统一获取 creep 名称
 * 项目中想要获取某个 creep 的名字必须通过这里获取
 */
export class GetName {
    static claimer = (targetRoomName: string) => `${targetRoomName} claimer`
    static reserver = (targetRoomName: string) => `${targetRoomName} reserver${Game.time}`
    static signer = (roomName: string) => `${roomName} signer`
    static remoteBuilder = (remoteRoomName: string) => `${remoteRoomName} RemoteBuilder`
    static remoteUpgrader = (remoteRoomName: string) => `${remoteRoomName} RemoteUpgrader`
    static remoteHarvester = (remoteRoomName: string, sourceId: Id<Source>) => `${remoteRoomName} remoteHarvester${sourceId}`
    static reiver = (roomName: string) => `${roomName} reiver ${Game.time}`
}
