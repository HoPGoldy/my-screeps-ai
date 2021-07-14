import { baseLayout } from "@/modulesGlobal/autoPlanning/constant"
import { findBaseCenterPos } from "@/modulesGlobal/autoPlanning/planBasePos"

/**
 * Game.market.extendOrder 的别名
 * 
 * @param orderId 订单的 id
 * @param amount 要追加的数量
 */
export const orderExtend = function (orderId: string, amount: number) {
    const actionResult = Game.market.extendOrder(orderId, amount)

    let returnString = ''
    if (actionResult === OK) returnString = '订单追加成功'
    else returnString = `订单追加失败，错误码 ${returnString}`

    return returnString
}

/**
* 把房间挂载到全局
* 来方便控制台操作，在访问时会实时的获取房间对象
* 注意：仅会挂载 Memory.rooms 里有的房间
*/
export const roomAlias = Object.keys(Memory.rooms || {}).reduce((getters, roomName) => {
    // 大写房间名和小写房间名都挂一下
    getters[roomName] = getters[roomName.toLowerCase()] = (() => Game.rooms[roomName])
    return getters
}, {})

/**
 * 查询指定资源在各个房间中的数量
 * 
 * @param resourceName 要查询的资源名
 */
export const seeres = function (resourceName: ResourceConstant): string {
    let total = 0

    let log = `${resourceName} 的分布如下：\n`
    // 遍历所有房间并检查对应的存储建筑
    log += Object.values(Game.rooms).map(room => {
        // 统计数量
        const { total: amount } = room.myStorage.getResource(resourceName)
        total += amount

        // 如果有就列出显示
        if (amount > 0) return `${room.name} => ${amount}`
        else return false
    }).filter(Boolean).join('\n')

    log += `\n共计: ${total}`
    return log
}

/**
 * 所有 creep 欢呼
 * 
 * @param content 要欢呼的内容
 * @param toPublic 是否对其他人可见
 */
export const hail = function (content: string = '', toPublic: boolean = true): string {
    Object.values(Game.creeps).forEach(creep => creep.say(`${content}!`, toPublic))

    return content ? content : 'yeah!'
}

/**
 * 对指定房间运行基地查找
 * 
 * @param roomName 房间名
 */
export const base = function (roomName: string): string {
    const targetPos = findBaseCenterPos(roomName)
    const firstSpawn = baseLayout[0][STRUCTURE_SPAWN][0]

    if (targetPos.length <= 0) return `[${roomName}] 未找到合适的中心点，请确保该房间中有大于 11*11 的空地。`

    const logs = [`[${roomName}] 找到如下适合作为基地中心的点位:`]
    logs.push(...targetPos.map(pos => `[基地中心] ${pos.x} ${pos.y} [spawn 位置] ${pos.x + firstSpawn[0]}, ${pos.y + firstSpawn[1]}`))

    return logs.join('\n')
}

/**
 * 全局发送资源到指定房间
 * 会检查哪个房间包含指定资源，并调用 Room.giver 方法发送资源
 * 
 * @param roomName 房间名
 * @param resourceType 资源类型
 * @param amount 发送数量
 */
export const give = function (roomName: string, resourceType: ResourceConstant, amount: number): string {
    const logs: string[] = [ '已启动全局资源调配' ]
    let sendAmount = 0

    // 遍历所有房间进行查找
    for (const currentRoomName in Game.rooms) {
        if (amount - sendAmount <= 0) break
        // 没有对应资源就下个房间
        const room = Game.rooms[currentRoomName]
        if (roomName === room.name || !room.terminal || !room.terminal.my || room.terminal.store[resourceType] <= 0) continue

        // 计算本房间应发送的数量（不超的情况下直接发完）
        const roomAmount = Math.min(room.terminal.store[resourceType], amount - sendAmount)

        // 发送资源并记录结果
        logs.push(`[${currentRoomName}]${room.giver(roomName, resourceType, roomAmount)}`)
        sendAmount += roomAmount
    }

    logs.push(`调配完成，向 ${roomName} 发送 ${resourceType} 共计 ${sendAmount}`)

    return logs.join('\n')
}