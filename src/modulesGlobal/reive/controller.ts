import { useRevier } from './hooks/useRevier'
import { ReiveContext } from './types'

export const createReive = function (context: ReiveContext) {
    const { env, getMemory } = context

    const { reiver, releaseReiver } = useRevier(context)

    /**
     * 开始掠夺房间
     *
     * @param targetRoomName 要掠夺的房间
     * @param originRoomName 要存放到的房间（也是孵化房间）
     * @param reiverNumber 要孵化的掠夺单位数量
     */
    const start = function (targetRoomName: string, originRoomName: string, reiverNumber = 2): string {
        const spawnRoom = env.getRoomByName(originRoomName)
        if (!spawnRoom) return `找不到 ${originRoomName}，无法发布掠夺单位`

        for (let i = 0; i < reiverNumber; i++) {
            releaseReiver(spawnRoom, targetRoomName)
        }
    }

    /**
     * 添加要掠夺的资源
     *
     * @param resources 要掠夺的资源
     */
    const addTarget = function (...resources: ResourceConstant[]): string {
        const memory = getMemory()
        if (!memory.reiveList) memory.reiveList = []

        // 确保新增的资源不会重复
        memory.reiveList = _.uniq([...memory.reiveList, ...resources])
        return `[reiver] 添加成功，${show()}`
    }

    /**
     * 移除要掠夺的资源
     * 参数为空时移除所有
     *
     * @param resources 要移除的掠夺资源
     */
    const removeTarget = function (...resources: ResourceConstant[]): string {
        const memory = getMemory()
        if (!memory.reiveList) memory.reiveList = []

        // 更新列表
        if (resources.length <= 0) delete memory.reiveList
        else memory.reiveList = _.difference(memory.reiveList, resources)

        return `[bypass] 移除成功，${show()}`
    }

    /**
     * 显示所有掠夺资源
     */
    const show = function (): string {
        const memory = getMemory()
        const logs: string[] = []
        if (!memory.reiveList || memory.reiveList.length <= 0) logs.push('暂无特指，将掠夺所有资源')
        else logs.push(`当前仅会掠夺如下资源：${memory.reiveList.join(' ')}`)

        if (!memory.reiveList) logs.push('暂无正在进行的掠夺工作')
        else {
            Object.entries(memory.reiver).forEach(([spawnRoomName, reivers]) => {
                logs.push(` - ${spawnRoomName}: ${Object.keys(reivers).join(', ')}`)
            })
        }

        return logs.join('\n')
    }

    const run = function () {
        const memory = getMemory()
        if (!memory.reiver) return

        Object.keys(memory.reiver).forEach(spawnRoomName => {
            const spawnRoom = env.getRoomByName(spawnRoomName)
            reiver.run(spawnRoom)
        })
    }

    return { addTarget, removeTarget, show, run, start }
}

/**
 * 掠夺控制器
 */
export type ReiveController = ReturnType<typeof createReive>
