import { colorful } from '@/utils'
import { createHelp } from '@/modulesGlobal/console'

/**
 * Factory 上的用户控制接口
 */
export default class TaskConsole extends Room {
    public taskshow(): string {
        return ''
    }

    public taskhelp(): string {
        return createHelp({
            name: '任务控制台',
            describe: '管理房间物流任务、中央物流任务以及工作任务三大运维模块',
            api: [
                {
                    title: '显示任务队列详情',
                    functionName: 'taskshow'
                }
            ]
        })
    }
}