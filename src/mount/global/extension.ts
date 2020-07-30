import { findBaseCenterPos } from "modules/autoPlanning/planBasePos"
import { baseLayout } from "setting"
import { createHelp } from "modules/help"
import creepApi from 'modules/creepController'

// 全局拓展对象
export default {
    /**
     * Game.getObjectById 的别名
     * 
     * @param id 游戏对象的 id
     */
    get(id: string): any {
        return Game.getObjectById(id)
    },

    /**
     * Game.market.extendOrder 的别名
     * 
     * @param orderId 订单的 id
     * @param amount 要追加的数量
     */
    orderExtend(orderId: string, amount: number) {
        const actionResult = Game.market.extendOrder(orderId, amount)

        let returnString = ''
        if (actionResult === OK) returnString = '订单追加成功'
        else returnString = `订单追加失败，错误码 ${returnString}`

        return returnString
    },

    /**
     * 查询指定资源在各个房间中的数量
     * 
     * @param resourceName 要查询的资源名
     */
    seeres(resourceName: ResourceConstant): string {
        // 根据资源不同选择不同的查询目标
        const source = resourceName === RESOURCE_ENERGY ? STRUCTURE_STORAGE : STRUCTURE_TERMINAL
        let total = 0

        let log = `${resourceName} 的分布如下：\n`
        // 遍历所有房间并检查对应的存储建筑
        log += Object.values(Game.rooms).map(room => {
            // 统计数量
            const amount = room[source] ? (room[source].store[resourceName] || 0) : 0
            total += amount

            // 如果有就列出显示
            if (room[source] && amount > 0) return `${room.name} => ${amount}`
            else return false
        }).filter(res => res).join('\n')

        log += `\n共计: ${total}`
        return log
    },

    /**
     * 所有 creep 欢呼
     * 
     * @param content 要欢呼的内容
     * @param toPublic 是否对其他人可见
     */
    hail(content: string = '', toPublic: boolean = true): string {
        Object.values(Game.creeps).forEach(creep => creep.say(`${content}!`, toPublic))

        return content ? content : 'yeah!'
    },

    /**
     * 对指定房间运行基地查找
     * 
     * @param roomName 房间名
     */
    base(roomName: string): string {
        const targetPos = findBaseCenterPos(roomName)
        const firstSpawn = baseLayout[1][STRUCTURE_SPAWN][0]

        if (targetPos.length <= 0) return `[${roomName}] 未找到合适的中心点，请确保该房间中有大于 11*11 的空地。`
        
        const logs = [`[${roomName}] 找到如下适合作为基地中心的点位:`]
        logs.push(...targetPos.map(pos => `[基地中心] ${pos.x} ${pos.y} [spawn 位置] ${pos.x + firstSpawn[0]}, ${pos.y + firstSpawn[1]}`))

        return logs.join('\n')
    },

    /**
     * 全局发送资源到指定房间
     * 会检查哪个房间包含指定资源，并调用 Room.giver 方法发送资源
     * 
     * @param roomName 房间名
     * @param resourceType 资源类型
     * @param amount 发送数量
     */
    give(roomName: string, resourceType: ResourceConstant, amount: number): string {
        const logs: string[] = [ '已启动全局资源调配' ]
        let sendAmount = 0

        // 遍历所有房间进行查找
        for (const currentRoomName in Game.rooms) {
            if (amount - sendAmount <= 0) break
            // 没有对应资源就下个房间
            const room = Game.rooms[currentRoomName]
            if (!room.terminal || !room.terminal.my || room.terminal.store[resourceType] <= 0) continue

            // 计算本房间应发送的数量（不超的情况下直接发完）
            const roomAmount = Math.min(room.terminal.store[resourceType], amount - sendAmount)

            // 发送资源并记录结果
            logs.push(`[${currentRoomName}]${room.giver(roomName, resourceType, roomAmount)}`)
            sendAmount += roomAmount
        }

        logs.push(`调配完成，向 ${roomName} 发送 ${resourceType} 共计 ${sendAmount}`)

        return logs.join('\n')
    },

    /**
     * 白名单控制 api
     * 挂载在全局，由玩家手动调用
     * 白名单仅应用于房间 tower 的防御目标，不会自动关闭 rempart，也不会因为进攻对象在白名单中而不攻击
     */
    whitelist: {
        /**
         * 添加用户到白名单
         * 重复添加会清空监控记录
         * 
         * @param userName 要加入白名单的用户名
         */
        add(userName: string): string {
            if (!Memory.whiteList) Memory.whiteList = {}
    
            Memory.whiteList[userName] = 0
    
            return `[白名单] 玩家 ${userName} 已加入白名单`
        },
    
        /**
         * 从白名单中移除玩家
         * 
         * @param userName 要移除的用户名
         */
        remove(userName: string): string {
            if (!(userName in Memory.whiteList)) return `[白名单] 该玩家未加入白名单`
    
            const enterTicks = Memory.whiteList[userName]
            delete Memory.whiteList[userName]
            // 如果玩家都删完了就直接移除白名单
            if (Object.keys(Memory.whiteList).length <= 0) delete Memory.whiteList
    
            return `[白名单] 玩家 ${userName} 已移出白名单，已记录的活跃时长为 ${enterTicks}`
        },
    
        /**
         * 显示所有白名单玩家及其活跃时长
         */
        show() {
            if (!Memory.whiteList) return `[白名单] 未发现玩家`
            const logs = [ `[白名单] 玩家名称 > 该玩家的单位在自己房间中的活跃总 tick 时长` ]
    
            // 绘制所有的白名单玩家信息
            logs.push(...Object.keys(Memory.whiteList).map(userName => `[${userName}] > ${Memory.whiteList[userName]}`))
    
            return logs.join('\n')
        },
    
        /**
         * 帮助
         */
        help() {
            return createHelp({
                name: '白名单模块',
                describe: '白名单中的玩家不会被房间的 tower 所攻击，但是会记录其访问次数',
                api: [
                    {
                        title: '添加新玩家到白名单',
                        params: [
                            { name: 'userName', desc: '要加入白名单的用户名' }
                        ],
                        functionName: 'add'
                    },
                    {
                        title: '从白名单移除玩家',
                        params: [
                            { name: 'userName', desc: '要移除的用户名' }
                        ],
                        functionName: 'remove'
                    },
                    {
                        title: '列出所有白名单玩家',
                        functionName: 'show'
                    }
                ]
            })
        }
    },

    /**
     * 绕过房间 api
     * 用于配置在远程寻路时需要避开的房间，注意，该配置将影响所有角色，包括战斗角色。
     * 所以在进攻房间前请确保该房间不在本配置项中
     */
    bypass: {
        /**
         * 添加绕过房间
         * 
         * @param roomNames 要添加的绕过房间名列表
         */
        add(...roomNames: string[]): string {
            if (!Memory.bypassRooms) Memory.bypassRooms = []

            // 确保新增的房间名不会重复
            Memory.bypassRooms = _.uniq([ ...Memory.bypassRooms, ...roomNames])

            return `[bypass] 已添加绕过房间，${this.show()}`
        },

        /**
         * 移除绕过房间
         * 
         * @param roomNames 要移除的房间名列表
         */
        remove(...roomNames: string[]): string {
            if (!Memory.bypassRooms) Memory.bypassRooms = []

            // 移除重复的房间
            if (roomNames.length <= 0) delete Memory.bypassRooms
            else Memory.bypassRooms = _.difference(Memory.bypassRooms, roomNames)

            return `[bypass] 已移除绕过房间，${this.show()}`
        },

        /**
         * 显示所有绕过房间
         */
        show(): string {
            if (!Memory.bypassRooms || Memory.bypassRooms.length <= 0) return `当前暂无绕过房间`
            return `当前绕过房间列表：${Memory.bypassRooms.join(' ')}`
        },

        /**
         * 帮助信息
         */
        help() {
            return createHelp({
                name: '绕过房间',
                describe: '通过该模块添加的房间将不会被纳入远程寻路，但是要注意如果之前有寻路缓存则可能该模块无效',
                api: [
                    {
                        title: '添加绕过房间',
                        params: [
                            { name: '...roomNames', desc: '要添加的绕过房间名列表' }
                        ],
                        functionName: 'add'
                    },
                    {
                        title: '移除绕过房间',
                        params: [
                            { name: '...roomNames', desc: '[可选] 要移除的房间名列表，置空来移除所有' }
                        ],
                        functionName: 'remove'
                    },
                    {
                        title: '显示所有绕过房间',
                        functionName: 'show'
                    }
                ]
            })
        }
    },

    /**
     * 掠夺配置 api
     * 用于让 reiver 搬运指定的资源，该列表不存在时将默认搬运所有的资源
     */
    reive: {
        /**
         * 添加要掠夺的资源
         * 
         * @param resources 要掠夺的资源
         */
        add(...resources: ResourceConstant[]): string {
            if (!Memory.reiveList) Memory.reiveList = []

            // 确保新增的资源不会重复
            Memory.reiveList = _.uniq([ ...Memory.reiveList, ...resources])

            return `[reiver] 添加成功，${this.show()}`
        },

        /**
         * 移除要掠夺的资源
         * 参数为空时移除所有
         * 
         * @param resources 要移除的掠夺资源
         */
        remove(...resources: ResourceConstant[]): string {
            if (!Memory.reiveList) Memory.reiveList = []

            // 更新列表
            if (resources.length <= 0) delete Memory.reiveList
            else Memory.reiveList = _.difference(Memory.reiveList, resources)

            return `[bypass] 移除成功，${this.show()}`
        },

        /**
         * 显示所有掠夺资源
         */
        show(): string {
            if (!Memory.reiveList || Memory.reiveList.length <= 0) return `暂无特指，将掠夺所有资源`
            return `当前仅会掠夺如下资源：${Memory.reiveList.join(' ')}`
        },

        /**
         * 帮助信息
         */
        help() {
            return createHelp({
                name: '资源掠夺模块',
                describe: '该模块会影响 reiver 单位的行为，如果不添加的话，reiver 将会掠夺目标建筑内的所有资源',
                api: [
                    {
                        title: '添加要掠夺的资源',
                        describe: '当配置了掠夺资源时，reiver 将只会搬回列表指定的资源',
                        params: [
                            { name: '...resources', desc: '要掠夺的资源' }
                        ],
                        functionName: 'add'
                    },
                    {
                        title: '移除要掠夺的资源',
                        params: [
                            { name: '...resources', desc: '[可选] 不再掠夺的资源，置空来移除所有' }
                        ],
                        functionName: 'remove'
                    },
                    {
                        title: '显示所有掠夺资源',
                        functionName: 'show'
                    }
                ]
            })
        }
    },

    // 将 creepApi 挂载到全局方便手动发布或取消 creep
    creepApi
}