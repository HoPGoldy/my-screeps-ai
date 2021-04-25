import { createHelp } from '@/modules/console'
import { colorful, createLink } from '@/utils'

/**
 * 帮助文档中的标题
 */
 export const PROJECT_TITLE = [
    String.raw`        __  __      ____  ______      __    __         _____                               `,
    String.raw`       / / / /___  / __ \/ ____/___  / /___/ /_  __   / ___/_____________  ___  ____  _____`,
    String.raw`      / /_/ / __ \/ /_/ / / __/ __ \/ / __  / / / /   \__ \/ ___/ ___/ _ \/ _ \/ __ \/ ___/`,
    String.raw`     / __  / /_/ / ____/ /_/ / /_/ / / /_/ / /_/ /   ___/ / /__/ /  /  __/  __/ /_/ (__  ) `,
    String.raw`    /_/ /_/\____/_/    \____/\____/_/\__,_/\__, /   /____/\___/_/   \___/\___/ .___/____/  `,
    String.raw`                                          /____/                            /_/              openSource at github - ${createLink('hopgoldy/screeps-ai', 'https://github.com/HoPGoldy/my-screeps-ai')}`
]

export default (): string => [
    ...PROJECT_TITLE.map(line => colorful(line, 'blue', true)),

    `\n半自动 AI，调用指定房间 help 方法来查看更详细的帮助信息 (如：${colorful('Game.rooms.W1N1.help', 'yellow')}())。在 ${colorful('Link, Factory, Terminal, PowerSpawn, Observer', 'yellow')} 对象实例上也包含对应的 help 方法。\n`,

    createHelp(
        {
            name: '全局指令',
            describe: '直接输入就可以执行，不需要加 ()',
            api: [
                {
                    title: '查看资源常量',
                    commandType: true,
                    functionName: 'res'
                },
                {
                    title: '查看 powerSpawn 状态汇总',
                    commandType: true,
                    functionName: 'ps'
                },
                {
                    title: '查看 observer 状态汇总',
                    commandType: true,
                    functionName: 'ob'
                },
                {
                    title: '查看商品生产线',
                    commandType: true,
                    functionName: 'comm'
                },
                {
                    title: '列出所有路径缓存',
                    describe: '路径缓存是全局的，会在 global 重置时清空',
                    commandType: true,
                    functionName: 'route'
                },
                {
                    title: '核弹发射规划',
                    describe: '向指定旗帜发射核弹，直接输入该命令来了解更多信息',
                    commandType: true,
                    functionName: 'nuker'
                }
            ]
        },
        {
            name: '全局方法',
            describe: '定义在全局的函数，优化手操体验',
            api: [
                {
                    title: '获取游戏对象',
                    describe: 'Game.getObjectById 方法的别名',
                    params: [
                        { name: 'id', desc: '要查询的对象 id' }
                    ],
                    functionName: 'get'
                },
                {
                    title: '追加订单容量',
                    describe: 'Game.market.extendOrder 方法的别名',
                    params: [
                        { name: 'orderId', desc: '订单的 id' },
                        { name: 'amount', desc: '要追加的数量' }
                    ],
                    functionName: 'orderExtend'
                },
                {
                    title: '查询指定资源',
                    describe: '全局搜索资源的数量以及所处房间',
                    params: [
                        { name: 'resourceName', desc: '要查询的资源名' }
                    ],
                    functionName: 'seeres'
                },
                {
                    title: '运行自动选址',
                    params: [
                        { name: 'roomName', desc: '要搜索的房间' }
                    ],
                    functionName: 'base'
                },
                {
                    title: '全局发送资源',
                    describe: '会遍历所有房间搜索资源并发送直到总量到达指定数量',
                    params: [
                        { name: 'roomName', desc: '要发送到的房间名' },
                        { name: 'resourceType', desc: '资源类型' },
                        { name: 'amount', desc: '发送数量' },
                    ],
                    functionName: 'give'
                },
                {
                    title: '欢呼',
                    params: [
                        { name: 'content', desc: '欢呼内容' },
                        { name: 'toPublic', desc: '[可选] 其他人是否可见，默认为 true' },
                    ],
                    functionName: 'hail'
                }
            ]
        },
        {
            name: '全局模块',
            describe: '可以全局访问的模块，访问其 help 方法来了解更多信息。',
            api: [
                {
                    title: '白名单',
                    describe: '查看白名单帮助信息',
                    functionName: 'whitelist.help'
                },
                {
                    title: '房间绕过',
                    describe: '查看房间绕过帮助信息',
                    functionName: 'bypass.help'
                },
                {
                    title: '掠夺配置',
                    describe: '查看掠夺配置帮助信息',
                    functionName: 'reive.help'
                }
            ]
        }
    )
].join('\n')