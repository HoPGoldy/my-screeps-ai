import { createHelp } from "@/modules/help"

/**
 * 白名单控制 api
 * 挂载在全局，由玩家手动调用
 * 白名单仅应用于房间 tower 的防御目标，不会自动关闭 rempart，也不会因为进攻对象在白名单中而不攻击
 */
export default {
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
}

declare global {
    interface Memory {
        /**
         * 白名单，通过全局的 whitelist 对象控制
         * 键是玩家名，值是该玩家进入自己房间的 tick 时长
         */
        whiteList: {
            [userName: string]: number
        }
    }
}