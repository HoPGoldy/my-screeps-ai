const { linkTypeConfig } = require('config.link')
 
function linkWork(room) {
    for (const linkId in linkTypeConfig[room.name].output) {
        transferEnergy(Game.getObjectById(linkId), linkTypeConfig[room.name].input)
    }
}

function transferEnergy(link, targetLink) {
    if (targetLink.length <= 0) {
        console.log(`link ${link} 想要传递能量，但是没有设置目标link`)
        return false
    }

    const target = targetLink.reduce((smallTarget, target) => {
        return smallTarget.enrgy < target.enrgy ? smallTarget : target
    })
    link.transferEnergy(target)
}

module.exports = linkWork