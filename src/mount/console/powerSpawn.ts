import { createHelp } from '@/utils'

export class PowerSpawnConsole extends Room {
    public pon () {
        return this.psController.on()
    }

    public poff () {
        return this.psController.off()
    }

    public pshow () {
        return this.psController.show()
    }

    public phelp (): string {
        return createHelp({
            name: 'PowerSpawn 控制台',
            describe: 'ps 默认启用，会自动处理房间中的能量和 power。',
            api: [
                {
                    title: '启动/恢复处理 power',
                    functionName: 'pon'
                },
                {
                    title: '暂停处理 power',
                    functionName: 'poff'
                },
                {
                    title: '查看当前状态',
                    functionName: 'pshow'
                }
            ]
        })
    }
}
