import role from './role'


// --------------------------------------------- 以下为 creep 配置项 ---------------------------------------------


/**
 * creep 配置项 (重要)
 * 
 * 此列表标记了所有 creep 的信息和要执行的逻辑
 * creep 的日常升级也应通过修改该列表完成
 * [键名]: 该 creep 的角色(role)
 * [值]: 该 creep 的全部信息
 * 
 * 在新增完后可以手动执行全局的 reload 方法来将新增的 creep 添加到待生成队列
 * 而对 creep 逻辑的修改会直接生效
 */
//Spawn
var room1spawn1='EricGuoR1S1'
var room1spawn2='EricGuoR1S2'
var room1spawn3='EricGuoR'
var room2spawn1='EricGuoR2S1'
var room2spawn2='EricGuoR2S2'
var room3spawn1='EricGuoR3S1'
var room3spawn2='EricGuoR3S2'
var room4spawn1='EricGuoR4S1'
var room5spawn1='EricGuoR5S1'
//Link
var room1link1='5db398c5b6c3813706a432d9'
var room1link2='5dc44a69466d5b11448fdba3'
var room1link3='5df25035e2ef62c0f28516fb'
var room2link1='5dd125663779d565a1e1f71d'
var room2link2='5dd9ce9e5e3ee2c420a0feb2'
var room2link3='5df24ed4143fe030d6b27995'
var room3link1='5dd93beb4b7f961de7246253'
var room3link2='5de220619a53d3bc253a49a4'
var room4link1='5de68d620a41179e7fbc2d32'
var room4link2='5df9265bf0aef9254c10f7c1'
var room5link1='5dfb62c6d8f1f2caeb55d92b'
//Source
var room1source1='5bbcadba9099fc012e637b71'
var room1source2='5bbcadba9099fc012e637b73'
var room2source1='5bbcadc99099fc012e637dc0'
var room2source2='5bbcadc99099fc012e637dc1'
var room3source1='5bbcad9c9099fc012e63782e'
var room3source2='5bbcad9c9099fc012e63782f'
var room4source1='5bbcad9c9099fc012e637828'
var room4source2='5bbcad9c9099fc012e637827'
var room5source1='5bbcad8a9099fc012e6376a0'
var room5source2='5bbcad8a9099fc012e6376a1'
//Storage
var room1storage='5db1eb2e5add9c4406e2c310'
var room2storage='5dcd4e54fbe41e905af2fadf'
var room3storage='5dd0c35dcfe6ad7a37bb9123'
var room4storage='5de17e10c41ac12b80c10063'
var room5storage='5df2a24c9837fa3e80bbcd7a'

export const creepConfigs: ICreepConfigs = {
    // 1房 7级
    E14N43Harvester1: role.collector(room1spawn1, room1source1, room1link1),
    E14N43Harvester2: role.collector(room1spawn2, room1source2, room1link2),
    E14N43Miner: role.miner(room1spawn2),
    E14N43Transfer: role.transfer(room1spawn3),
    E14N43Builder1:role.builder(room1spawn1,room1storage),
    E14N43Builder2:role.builder(room1spawn2,room1storage),
    E14N43CenterTransfer: role.centerTransfer(room1spawn3, 16, 29), 
    E14N43Upgrader1: role.upgrader(room1spawn1, room1storage),
    
    //2房 6级
    E15N41Harvester1:role.collector(room2spawn1,room2source1,room2link2),
    E15N41Harvester2:role.collector(room2spawn2,room2source2,room2link1),
    E15N41Transfer1:role.transfer(room2spawn1),
    E15N41Upgrader1:role.upgrader(room2spawn1,room2storage),
    E15N41Builder2: role.builder(room2spawn2, room2storage),
    E15N41CenterTransfer:role.centerTransfer(room2spawn2,35,29),
    E15N41Miner:role.miner(room2spawn1),
    //3房 5级
    E12N44Harvester1:role.collector(room3spawn2,room3source1,room3link2),
    E12N44Harvester2:role.collector(room3spawn1,room3source2,room3link1),
    E12N44Upgrader:role.upgrader(room3spawn1,room3storage),
    E12N44Transfer:role.transfer(room3spawn1,room3storage),
    E12N44Builder:role.builder(room3spawn2,room3storage),
    E12N44Builder2:role.builder(room3spawn1,room3storage),
    E12N44Builder3:role.builder(room3spawn2,room3storage),
    E12N44CenterTransfer:role.centerTransfer(room3spawn1,23,22),
    E12N44Miner:role.miner(room3spawn2),
    //4房 
    E12N46Harvester1: role.collector(room4spawn1, room4source1,room4link1),
    E12N46Harvester2: role.collector(room4spawn1, room4source2,room4link2),
    E12N46Builder: role.builder(room4spawn1, room4storage),
    E12N46Upgrader: role.upgrader(room4spawn1, room4storage),
    E12N46Transfer:role.transfer(room4spawn1,room4storage),
    E12N46CenterTransfer:role.centerTransfer(room4spawn1,10,41),
    E12N46Miner:role.miner(room4spawn1),
    //5房
    E11N46Harvester1:role.collector(room5spawn1,room5source1,room5storage),
    E11N46Harvester2:role.collector(room5spawn1,room5source2,room5link1),
    E11N46Builder:role.builder(room5spawn1,room5storage),
    E11N46Upgrader:role.upgrader(room5spawn1,room5storage),
    E11N46CenterTransfer:role.centerTransfer(room5spawn1,24,41),
    E11N46Transfer:role.transfer(room5spawn1,room5storage),
    E11N46Miner:role.miner(room5spawn1),
    mistMiner1:role.remoteDepositHarvester(room5spawn1,"depositMist","5dff3848f4706233819878b6"),
    mistMiner2:role.remoteDepositHarvester(room5spawn1,"depositMist2","5dff3848f4706233819878b6"),
    

}


// creep 的默认内存
export const creepDefaultMemory: CreepMemory = {
    role: '',
    ready: false,
    working: false,
    path: [],
}

export const observeRooms:string[]=['E10N46','E10N45','E10N44','E10N43']