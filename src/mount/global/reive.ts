import { createHelp } from '@/utils'

/**
 * 掠夺配置 api
 * 用于让 reiver 搬运指定的资源，该列表不存在时将默认搬运所有的资源
 */
export default {
    /**
     * 添加要掠夺的资源
     *
     * @param resources 要掠夺的资源
     */
    add (...resources: ResourceConstant[]): string {
        if (!Memory.reiveList) Memory.reiveList = []

        // 确保新增的资源不会重复
        Memory.reiveList = _.uniq([...Memory.reiveList, ...resources])
        return `[reiver] 添加成功，${this.show()}`
    },

    /**
     * 移除要掠夺的资源
     * 参数为空时移除所有
     *
     * @param resources 要移除的掠夺资源
     */
    remove (...resources: ResourceConstant[]): string {
        if (!Memory.reiveList) Memory.reiveList = []

        // 更新列表
        if (resources.length <= 0) delete Memory.reiveList
        else Memory.reiveList = _.difference(Memory.reiveList, resources)

        return `[bypass] 移除成功，${this.show()}`
    },

    /**
     * 显示所有掠夺资源
     */
    show (): string {
        if (!Memory.reiveList || Memory.reiveList.length <= 0) return '暂无特指，将掠夺所有资源'
        return `当前仅会掠夺如下资源：${Memory.reiveList.join(' ')}`
    },

    /**
     * 帮助信息
     */
    help () {
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
}

declare global {
    interface Memory {
        /**
         * 掠夺资源列表，如果存在的话 reiver 将只会掠夺该名单中存在的资源
         */
        reiveList: ResourceConstant[]
    }
}
