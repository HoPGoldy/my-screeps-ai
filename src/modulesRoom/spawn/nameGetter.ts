/**
 * 统一获取 creep 名称
 * 项目中想要获取某个 creep 的名字必须通过这里获取
 */
export class GetName {
    static harvester = (roomName: string, index: number) => `${roomName} harvester${index}`
    static miner = (roomName: string) => `${roomName} miner`
    static worker = (roomName: string, index: number | string) => `${roomName} worker${index}`
    static manager = (roomName: string, index: number | string) => `${roomName} manager${index}`
    static processor = (roomName: string) => `${roomName} processor`
    static claimer = (targetRoomName: string) => `${targetRoomName} claimer`
    static reserver = (targetRoomName: string) => `${targetRoomName} reserver${Game.time}`
    static signer = (roomName: string) => `${roomName} signer`
    static remoteBuilder = (remoteRoomName: string) => `${remoteRoomName} RemoteBuilder`
    static remoteUpgrader = (remoteRoomName: string) => `${remoteRoomName} RemoteUpgrader`
    static remoteHarvester = (remoteRoomName: string, sourceId: Id<Source>) => `${remoteRoomName} remoteHarvester${sourceId}`
    static depositHarvester = (flagName: string) => `${flagName} depoHarvester`
    static pbAttacker = (flagName: string, index: number) => `${flagName} attacker${index}`
    static pbHealer = (flagName: string, index: number) => `${flagName} healer${index}`
    static pbCarrier = (flagName: string, index: number) => `${flagName} carrier${index}`
    static reiver = (roomName: string) => `${roomName} reiver ${Game.time}`
    static soldier = (roomName: string, index: number) => `${roomName} soldier ${Game.time}-${index}`
    static boostDoctor = (roomName: string) => `${roomName} doctor ${Game.time}`
    static dismantler = (roomName: string, index: number) => `${roomName} dismantler ${Game.time}-${index}`
    static boostDismantler = (roomName: string) => `${roomName} dismantler ${Game.time}`
    static apocalypse = (roomName: string) => `${roomName} apocalypse ${Game.time}`
    static defender = (roomName: string) => `${roomName} defender`
    static repair = (roomName: string, index: number) => `${roomName} defender${index}`
}