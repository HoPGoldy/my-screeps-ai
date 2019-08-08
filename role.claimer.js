const claimerPath = require('moveSetting').getPath('claimer')
const { getStructureByFlag } = require('utils')

const CLAIM_FLAG_NAME = 'Claim'

const run = (creep) => {
    // creep.moveTo(new RoomPosition(24, 21, 'W48S6'))
    claim(creep)
}

function claim(creep) {
    const claimFlag = Game.flags[CLAIM_FLAG_NAME]
    if (!claimFlag) {
        console.log(`没有名为 ${CLAIM_FLAG_NAME} 的旗子`)
        return false
    }

    creep.moveTo(claimFlag.pos, claimerPath)
    if (claimFlag.room) {
        const target = getStructureByFlag(claimFlag, STRUCTURE_CONTROLLER)
        const claimResult = creep.claimController(target)
        // console.log(claimResult == 0 ? '正在占领' : `${creep.name} 占领失败，错误码 ${claimResult}`)
    }
}

module.exports = {
    run
}