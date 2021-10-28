import { createWarController } from '@/modulesGlobal/war'
import { WarModuleMemory } from '@/modulesGlobal/war/types'
import { createEnvContext } from '../utils'
import { createHelp } from '@/modulesGlobal/console'

declare global {
    interface Memory {
        wars: WarModuleMemory
    }
}

const warModule = createWarController({
    getMemory: () => Memory.wars,
    env: createEnvContext('war')
})

const showWarHelp = function () {
    return createHelp({
        name: '战争模块',
        describe: '启动、管理、终止全局的战争进程',
        api: [
            {
                title: '启动战争',
                describe: '应提前在最终目标上放置旗帜',
                params: [
                    { name: 'spawnRoomName', desc: '执行孵化的房间名' },
                    { name: 'warFlag', desc: '目标旗帜名称' }
                ],
                functionName: 'start'
            },
            {
                title: '显示所有战争状态',
                functionName: 'show'
            },
            {
                title: '设置默认小队',
                params: [
                    { name: 'squadType', desc: '小队类型' },
                    { name: 'needBoost', desc: '是否需要强化' },
                    { name: 'squadCode', desc: '小队代号' },
                ],
                functionName: 'setdefault'
            },
            {
                title: '取消默认小队',
                functionName: 'cleardefault'
            }
        ]
    })
}

export const war = {
    start: (spawnRoomName: string, warFlag: string) => {
        const warManager = warModule.startWar(spawnRoomName, warFlag)
        Object.assign(global, { [warFlag]: warManager })

        return `战争以启动，输入 ${warFlag}.help() 来查看详细操作`
    },
    show: warModule.showState,
    setdefault: warModule.setDefault,
    cleardefault: warModule.clearDefault,
    help: showWarHelp
}
