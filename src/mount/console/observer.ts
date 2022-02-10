import { createHelp } from '@/utils'

export class ObserverConsole extends Room {
    /**
     * 显示 ob 状态
     */
    public obshow () {
        return this.observerController.show()
    }

    /**
     * 新增监听房间
     */
    public obadd (...roomNames: string[]): string {
        this.observerController.addWatchRoom(...roomNames)
        return `[${this.name} observer] 已添加，${this.observerController.showWatchList()}`
    }

    /**
     * 移除监听房间
     */
    public obremove (...roomNames: string[]): string {
        this.observerController.removeWatchRoom(...roomNames)
        return `[${this.name} observer] 已移除，${this.observerController.showWatchList()}`
    }

    /**
     * 暂停 observer
     */
    public oboff (): string {
        this.observerController.off()
        return `[${this.name} observer] 已暂停`
    }

    /**
     * 重启 observer
     */
    public obon (): string {
        this.observerController.on()
        return `[${this.name} observer] 已恢复, ${this.observerController.showWatchList()}`
    }

    /**
     * 清空房间列表
     */
    public obclear (): string {
        this.observerController.clearWatchRoom()
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
