import { createWarController } from '@/modulesGlobal/war'
import { WarModuleMemory } from '@/modulesGlobal/war/types'
import { createEnvContext } from '../utils'
import { createHelp } from '@/modulesGlobal/console'
import { WarManager } from '@/modulesGlobal/war/warManager/warManager'
import { goTo } from '@/modulesGlobal/move'
import { TransportTaskType } from "@/modulesRoom/taskTransport/types";
import { CreepRole } from '@/role/types/role'

declare global {
    interface Memory {
        warMemory: WarModuleMemory
    }
}

/**
 * 战争管理器帮助
 */
const showGlobalWarHelp = () => createHelp({
    name: '全局战争管理模块',
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

/**
 * 战争进程帮助
 */
const showWarHelp = () => createHelp({
    name: '战争进程',
    describe: '管理战争中的小队，可通过创建名称为 “小队代号+数字” 的旗帜的方式为小队指定路径点，数字越小优先级越高，例如：alpha0',
    api: [
        {
            title: '新建小队',
            params: [
                { name: 'SquadType', desc: '小队类型' },
                { name: 'needBoost', desc: '是否需要 boost' },
                { name: 'targetFlagName', desc: '【可选】小队进攻的旗帜名，默认将以小队代号作为目标旗帜名' },
                { name: 'squadCode', desc: '【可选】小队代号' }
            ],
            functionName: 's'
        },
        {
            title: '终止战争',
            functionName: 'close'
        },
        {
            title: '继续战争',
            params: [
                { name: 'squadType', desc: '小队类型' },
                { name: 'needBoost', desc: '是否需要强化' },
                { name: 'squadCode', desc: '小队代号' },
            ],
            functionName: 'continue'
        },
        {
            title: '显示战争状态',
            functionName: 'show'
        },
    ]
})

/**
 * 把战争进程包装成更适合控制台操作的模样
 */
const warpConsoleFunc = function (warManager: WarManager) {
    const { warCode, addMobilize, closeWar, continueWar, showState } = warManager
    return {
        warCode,
        s: (...args: Parameters<typeof addMobilize>) => {
            const result = addMobilize(...args)
            return result ? '小队添加成功' : '小队添加失败'
        },
        close: () => {
            const [realColse, logContent] = closeWar()
            if (realColse) delete global[warCode]
            return logContent
        },
        continue: continueWar,
        show: showState,
        help: showWarHelp
    }
}

/**
 * 挂载战争进程到全局
 */
const mountToGlobal = function (warManager: ReturnType<typeof warpConsoleFunc>) {
    Object.assign(global, { [warManager.warCode]: warManager })
}

if (!Memory.warMemory) Memory.warMemory = { wars: {} }

// 链接依赖并构建战争模块
const warModule = createWarController({
    getMemory: () => Memory.warMemory,
    goTo: (creep, pos) => goTo(creep, pos, {}),
    remandSpawn: room => room.spawner.remandSpawn(),
    lendSpawn: room => room.spawner.lendSpawn(),
    getRoomManager: room => room.transport.getUnit(),
    addManager: (room, addNumber) => {
        if (room.spawner.getTaskByRole(CreepRole.Manager).length <= 0) {
            room.spawner.release.changeBaseUnit(CreepRole.Manager, addNumber)
        }
    },
    addFillEnergyTask: room => {
        room.transport.updateTask({
            type: TransportTaskType.FillExtension,
            priority: 10,
            to: [STRUCTURE_EXTENSION],
            res: [{ resType: RESOURCE_ENERGY }]
        }, { dispath: true })
    },
    getRoomSpawn: room => room[STRUCTURE_SPAWN],
    getResource: (room, res) => {
        const { total } = room.myStorage.getResource(res)
        return total
    },
    getRoomLab: room => room[STRUCTURE_LAB],
    addBoostTask: (room, config) => room.myLab.addBoostTask(config),
    getBoostState: (room, taskId) => room.myLab.getBoostState(taskId),
    boostCreep: (room, creep, taskId) => room.myLab.boostCreep(creep, taskId),
    finishBoost: (room, taskId) => room.myLab.finishBoost(taskId),
    env: createEnvContext('war')
})

// 初始化时在全局重建战争进程
warModule.wars.map(warpConsoleFunc).map(mountToGlobal)

const { startWar, showState, setDefault, clearDefault } = warModule

export const consoleWarModule = {
    start: (...args: Parameters<typeof startWar>) => {
        const [spawnRoomName, warFlagName] = args
        if (warFlagName in global) return `无法使用 ${warFlagName} 作为旗帜名，已存在同名的 global 属性`

        const warManager = startWar(...args)
        if (!warManager) return `战争未启动`

        mountToGlobal(warpConsoleFunc(warManager))
        return `战争已启动，输入 ${warFlagName}.help() 来查看详细操作`
    },
    show: showState,
    setdefault: setDefault,
    cleardefault: clearDefault,
    help: showGlobalWarHelp
}

export const warAppPlugin: AppLifecycleCallbacks = {
    tickStart: warModule.run
}