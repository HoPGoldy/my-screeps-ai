/**
 * 签名者
 * 会先抵达指定房间, 然后执行签名
 * 
 * @param spawnRoom 出生房间名称
 * @param targetRoomName 要签名的目标房间名
 * @param signText 要签名的内容
 */
const signer: CreepConfigGenerator<'signer'> = data => ({
    isNeed: () => false,
    target: creep => {
        if (creep.room.name === data.targetRoomName) {
            if (creep.signController(creep.room.controller, data.signText) === ERR_NOT_IN_RANGE) {
                creep.goTo(creep.room.controller.pos)
            }
        }
        else creep.goTo(new RoomPosition(25, 25, data.targetRoomName))

        return false
    },
    bodys: () => [ MOVE ]
})

export default signer