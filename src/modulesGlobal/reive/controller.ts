import { ReiveContext } from './types'

export const createReive = function (context: ReiveContext) {
    const { env, getMemory } = context

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
        if (!memory.reiveList || memory.reiveList.length <= 0) return '暂无特指，将掠夺所有资源'
        return `当前仅会掠夺如下资源：${memory.reiveList.join(' ')}`
    }

    const run = function () {

    }

    return { addTarget, removeTarget, show, run }
}

/**
 * 延迟任务创建器
 * 给该方法传入一个延迟任务回调，即可返回一个用于发布延迟任务的函数
 */
export type ReiveController = ReturnType<typeof createReive>
