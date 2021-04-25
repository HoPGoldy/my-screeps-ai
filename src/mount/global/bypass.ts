import { createHelp } from "@/modules/console"

/**
 * 绕过房间 api
 * 用于配置在远程寻路时需要避开的房间，注意，该配置将影响所有角色，包括战斗角色。
 * 所以在进攻房间前请确保该房间不在本配置项中
 */
export default {
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
}

declare global {
    interface Memory {
        /**
         * 要绕过的房间名列表，由全局模块 bypass 负责
         */
        bypassRooms: string[]
    }
}