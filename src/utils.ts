/**
* 获取指定方向的相反方向
* 
* @param direction 目标方向
*/
export function getOppositeDirection(direction: DirectionConstant): DirectionConstant {
   return <DirectionConstant>((direction + 3) % 8 + 1)
}

/**
 * 根据身体配置生成完成的身体数组
 * cpu 消耗: 0.028 左右
 * 
 * @param bodySet 身体部件配置对象
 */
export function calcBodyPart(bodySet: BodySet): BodyPartConstant[] {
    // 把身体配置项拓展成如下形式的二维数组
    // [ [ TOUGH ], [ WORK, WORK ], [ MOVE, MOVE, MOVE ] ]
    const bodys = Object.keys(bodySet).map(type => Array(bodySet[type]).fill(type))
    // 把二维数组展平
    return [].concat(...bodys)
}

/**
 * 生成通用身体部件获取函数
 * 
 * @param bodyConfig 该 creep 对应的身体配置项
 */
export function createBodyGetter(bodyConfig: BodyConfig): BodyPartGenerator {
    /**
     * 获取身体部件数组
     * 根据房间中现存的能量选择给定好的体型
     */
    return function(room: Room, spawn: StructureSpawn): BodyPartConstant[] {
        const targetLevel = Object.keys(bodyConfig).reverse().find(level => {
            // 先通过等级粗略判断，再加上 dryRun 精确验证
            const availableEnergyCheck = (Number(level) <= room.energyAvailable)
            const dryCheck = (spawn.spawnCreep(bodyConfig[level], 'bodyTester', { dryRun: true }) == OK)

            return availableEnergyCheck && dryCheck
        })
        if (!targetLevel) return [ ]

        // 获取身体部件
        const bodys: BodyPartConstant[] = bodyConfig[targetLevel]

        return bodys
    }
}

/**
 * 在绘制控制台信息时使用的颜色
 */
const colors: { [name in Colors]: string } = {
    red: '#ef9a9a',
    green: '#6b9955',
    yellow: '#c5c599',
    blue: '#8dc5e3'
}

/**
 * 给指定文本添加颜色
 * 
 * @param content 要添加颜色的文本
 * @param colorName 要添加的颜色常量字符串
 * @param bolder 是否加粗
 */
export function colorful(content: string, colorName: Colors = null, bolder: boolean = false): string {
    const colorStyle = colorName ? `color: ${colors[colorName]};` : ''
    const bolderStyle = bolder ? 'font-weight: bolder;' : ''

    return `<text style="${[ colorStyle, bolderStyle ].join(' ')}">${content}</text>`
}

/**
 * 生成控制台链接
 * @param content 要显示的内容
 * @param url 要跳转到的 url
 * @param newTab 是否在新标签页打开
 */
export function createLink(content: string, url: string, newTab: boolean = true): string {
    return `<a href="${url}" target="${newTab ? '_blank' : '_self'}">${content}</a>`
}

/**
 * 给房间内添加跳转链接
 * 
 * @param roomName 添加调整链接的房间名
 * @returns 打印在控制台上后可以点击跳转的房间名
 */
export function createRoomLink(roomName: string): string {
    return createLink(roomName, `https://screeps.com/a/#!/room/${Game.shard.name}/${roomName}`, false)
}

/**
 * 快捷生成单个常量帮助
 * 
 * @param name 常量简称
 * @param constant 常量名
 */
export function createConst(name: string, constant: string): string {
    return `${colorful(name, 'green')} ${colorful(constant, 'blue')}`
}

/**
 * 全局喊话
 */
export function globalSay(words: string[]) {
    if (!Memory.sayIndex) Memory.sayIndex = 0

    Object.values(Game.creeps).forEach(creep => creep.say(words[Memory.sayIndex], true))
    Memory.sayIndex = Memory.sayIndex + 1 >= words.length ? 0 : Memory.sayIndex + 1
}

declare global {
    interface Memory {
        /**
         * 全局的喊话索引
         */
        sayIndex?: number
    }
}

/**
 * 移除过期的 flag 内存
 */
export function clearFlag(): string {
    let logs = [ '已清理过期旗帜:' ]
    for (const flagName in Memory.flags) {
        if (!Game.flags[flagName]) {
            delete Memory.flags[flagName]
            logs.push(flagName)
        }
    }

    return logs.join(' ')
}

/**
 * 判断是否为白名单玩家
 * 
 * @param creep 要检查的 creep
 * @returns 是否为白名单玩家
 */
export function whiteListFilter(creep) {
    if (!Memory.whiteList) return true
    // 加入白名单的玩家单位不会被攻击，但是会被记录
    if (creep.owner.username in Memory.whiteList) {
        Memory.whiteList[creep.owner.username] += 1
        return false
    }

    return true
}

/**
 * 生成 pixel
 * 
 * @param cpuLimit 当 bucket 中的 cpu 到多少时才生成 pixel
 */
export function generatePixel(cpuLimit: number = 7000): void {
    if (Game.cpu.bucket >= cpuLimit && Game.cpu.generatePixel) Game.cpu.generatePixel()
}

/**
 * 生成 pixel 的框架插件
 */
export const generatePixelAppPlugin: AppLifecycleCallbacks = {
    tickEnd: generatePixel
}

/**
 * 全局日志
 * 
 * @param content 日志内容
 * @param prefixes 前缀中包含的内容
 * @param color 日志前缀颜色
 * @param notify 是否发送邮件
 */
export function log(content: string, prefixes: string[] = [], color: Colors = null, notify: boolean = false): OK {
    // 有前缀就组装在一起
    let prefix = prefixes.length > 0 ? `【${prefixes.join(' ')}】 ` : ''
    // 指定了颜色
    prefix = colorful(prefix, color, true)

    const logContent = `${prefix}${content}`
    console.log(logContent)
    // 转发到邮箱
    if (notify) Game.notify(logContent)

    return OK
}

/**
 * 在控制台中创建 HTML 元素的方法集合
 */
export const createElement = {
    customStyle: () => {
        const style = `<style>
            input {
                background-color: #2b2b2b;
                border: none;
                border-bottom: 1px solid #888;
                padding: 3px;
                color: #ccc;
            }
            select {
                border: none;
                background-color: #2b2b2b;
                color: #ccc;
            }
            button {
                border: 1px solid #888;
                cursor: pointer;
                background-color: #2b2b2b;
                color: #ccc;
            }
        </style>`

        return style.replace(/\n/g, '')
    },

    /**
     * 创建 input 输入框
     * @param detail 创建需要的信息
     */
    input(detail: InputDetail): string {
        return `${detail.label || ''} <input name="${detail.name}" placeholder="${detail.placeholder || ''}"/>`
    },

    /**
     * 创建 select 下拉框
     * @param detail 创建需要的信息
     */
    select(detail: SelectDetail): string {
        const parts = [ `${detail.label || ''} <select name="${detail.name}">` ]
        parts.push(...detail.options.map(option => ` <option value="${option.value}">${option.label}</option>`))
        parts.push(`</select>`)

        return parts.join('')
    },

    /**
     * 创建按钮
     * 按钮绑定的命令会在点击后发送至游戏控制台
     * @param detail 创建需要的信息
     */
    button(detail: ButtonDetail): string {
        return `<button onclick="${sendCommandToConsole(detail.command)}">${detail.content}</button>`
    },

    /**
     * 创建表单
     * @param name 表单的名称
     * @param details 表单元素列表
     * @param buttonDetail 按钮的信息
     */
    form(name: string, details: HTMLElementDetail[], buttonDetail: ButtonDetail): string {
        // 创建唯一的表单名
        const formName = name + Game.time.toString()

        // 添加样式和表单前标签
        const parts = [
            this.customStyle(),
            `<form name='${formName}'>`,
        ]
        
        // 添加表单内容
        parts.push(...details.map(detail => {
            switch (detail.type) {
                case 'input': 
                    return this.input(detail) + '    '
                case 'select':
                    return this.select(detail) + '    '
            }
        }))

        /**
         * 封装表单内容获取方法
         * 注意后面的 \`(${buttonDetail.command})(\${JSON.stringify(formDatas)\})\`
         * 这里之所以用 \ 把 ` 和 $ 转义了是因为要生成一个按钮点击时才会用到的模板字符串，通过这个方法来把表单的内容f=当做参数提供给 sendCommand 里要执行的方法
         * 如果直接填 formDatas 而不是 JSON.stringify(formDatas) 的话，会报错找不到 formdatas
         */
        const commandWarp = `(() => {
            const form = document.forms['${formName}']
            let formDatas = {}
            [${details.map(detail => `'${detail.name}'`).toString()}].map(eleName => formDatas[eleName] = form[eleName].value)
            angular.element(document.body).injector().get('Console').sendCommand(\`(${buttonDetail.command})(\${JSON.stringify(formDatas)\})\`, 1)
        })()`
        // 添加提交按钮
        parts.push(`<button type="button" onclick="${commandWarp.replace(/\n/g, ';')}">${buttonDetail.content}</button>`)
        parts.push(`</form>`)

        // 压缩成一行
        return parts.join('')
    }
}

/**
 * 获取一些格式固定，但是在多处调用的名字
 * 便于维护
 */
export const getName = {
    flagBaseCenter: (roomName: string): string => `${roomName} center`
}

/**
 * 给指定对象设置访问器
 * 
 * @param target 要设置访问器的对象
 * @param name 访问器的名字
 * @param getter 访问器方法
 */
export const createGetter = function (target: AnyObject, name: string, getter: () => any) {
    Object.defineProperty(target.prototype, name, {
        get: getter,
        enumerable: false,
        configurable: true
    })
}

/**
 * 在指定房间显示 cost
 * 
 * @param cost 要显示的 cost
 * @param room 要显示到的房间
 */
export const showCost = function (cost: CostMatrix, room: Room): void {
    for (let x = 1; x < 49; x ++) for (let y = 1; y < 49; y ++) {
        room.visual.text(cost.get(x, y).toString(), x, y, {
            color: '#a9b7c6',
            font: 0.5,
            opacity: 0.7
        })
    }
}

/**
 * 获取指定对象并缓存
 * 会将初始化回调的返回值进行缓存，该返回值 **必须拥有 id 字段**
 * 
 * @param initValue 初始化该值的回调，在没有找到缓存 id 时将会调用该方法获取要缓存的初始值
 * @param cachePlace id 存放的对象，一般位于 xxx.memory 上
 * @param cacheKey 要缓存到的键，例如 targetId 之类的字符串
 */
export const useCache = function <T extends ObjectWithId>(initValue: () => T, cachePlace: AnyObject, cacheKey: string): T {
    const cacheId = cachePlace[cacheKey]
    let target: T = undefined

    // 如果有缓存了，就读取缓存
    if (cacheId) {
        target = Game.getObjectById(cacheId)
        // 缓存失效了，移除缓存 id
        if (!target) delete cachePlace[cacheKey]

        return target
    }

    // 还没有缓存或者缓存失效了，重新获取并缓存
    target = initValue()
    if (target) cachePlace[cacheKey] = target.id

    return target
}