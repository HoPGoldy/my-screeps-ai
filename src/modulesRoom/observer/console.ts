import { createHelp } from '@/modulesGlobal'

export default class ObserverConsole extends Room {
    /**
     * 显示 ob 状态
     */
    public obshow () {
        return this.myObserver.show()
    }

    /**
     * 新增监听房间
     */
    public obadd (...roomNames: string[]): string {
        this.myObserver.addWatchRoom(...roomNames)
        return `[${this.name} observer] 已添加，${this.myObserver.showList()}`
    }

    /**
     * 移除监听房间
     */
    public obremove (...roomNames: string[]): string {
        this.myObserver.removeWatchRoom(...roomNames)
        return `[${this.name} observer] 已移除，${this.myObserver.showList()}`
    }

    /**
     * 暂停 observer
     */
    public oboff (): string {
        this.myObserver.off()
        return `[${this.name} observer] 已暂停`
    }

    /**
     * 重启 observer
     */
    public obon (): string {
        this.myObserver.on()
        return `[${this.name} observer] 已恢复, ${this.myObserver.showList()}`
    }

    /**
     * 清空房间列表
     */
    public obclear (): string {
        this.myObserver.clearWatchRoom()
        return `[${this.name} observer] 已清空监听房间`
    }

    /**
     * 帮助
     */
    public obhelp (): string {
        return createHelp({
            name: 'Observer 控制台',
            describe: 'Observer 默认关闭，新增监听房间后将会启动，在监听房间中发现 pb 或者 deposit 时将会自动发布采集单位。',
            api: [
                {
                    title: '新增监听房间',
                    params: [
                        { name: '...roomNames', desc: '要监听的房间名列表' }
                    ],
                    functionName: 'obadd'
                },
                {
                    title: '移除监听房间',
                    params: [
                        { name: '...roomNames', desc: '要移除的房间名列表' }
                    ],
                    functionName: 'obremove'
                },
                {
                    title: '显示状态',
                    functionName: 'obshow'
                },
                {
                    title: '移除所有监听房间',
                    functionName: 'obclear'
                },
                {
                    title: '暂停工作',
                    functionName: 'oboff'
                },
                {
                    title: '重启工作',
                    functionName: 'obon'
                }
            ]
        })
    }
}
