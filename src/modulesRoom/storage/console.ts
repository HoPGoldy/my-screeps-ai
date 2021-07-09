import { createHelp } from '@/modulesGlobal/console'

/**
 * Storage 的用户访问接口
 */
export default class StorageConsole extends Room {
    /**
     * 在 storage 和 terminal 之间进行资源平衡
     * 以及 sb 是 storage balance 的缩写
     */
    sb(): string {
        const result = this.myStorage.balanceResource()
        if (result === ERR_NOT_FOUND) return 'storage 或 termianl 不存在'
        return result.map(task => JSON.stringify(task)).join('\n')
    }

    public shelp(): string {
        return createHelp({
            name: 'Storage 控制台',
            describe: '在多房间之间平衡能量，在 terminal 之间',
            api: [
                {
                    title: '添加资源监听',
                    describe: '新增期望值和交易规则，terminal 会自动对其监听并维持期望',
                    params: [
                        { name: 'resourceType', desc: '终端要监听的资源类型(只会监听自己库存中的数量)' },
                        { name: 'amount', desc: '指定类型的期望数量' },
                        { name: 'mod', desc: '[可选] 监听类型，分为 0(获取，默认), 1(对外提供)' },
                        { name: 'channel', desc: '[可选] 渠道，分为 0(拍单，默认), 1(挂单), 2(共享)，3(支援)'},
                        { name: 'priceLimit', desc: '[可选] 价格限制，若不填则通过历史平均价格检查'},
                        { name: 'supportRoomName', desc: '[可选] 要支援的房间名，在 channel 为 3 时生效'}
                    ],
                    functionName: 'tadd'
                },
                {
                    title: 'GUI - 添加资源监听',
                    functionName: 'gtadd'
                },
                {
                    title: '移除资源监听',
                    describe: '该操作会自动从 storage 里取出能量',
                    params: [
                        { name: 'index', desc: '移除监听的任务索引' }
                    ],
                    functionName: 'tremove'
                },
                {
                    title: '列出所有监听任务',
                    functionName: 'tshow'
                },
                {
                    title: '重设默认监听',
                    params: [
                        { name: 'hard', desc: '[可选] 将移除非默认的监听任务，默认为 false' }
                    ],
                    functionName: 'treset'
                }
            ]
        })
    }
}