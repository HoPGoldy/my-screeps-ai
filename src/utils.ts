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
 * 执行 Hash Map 中子元素对象的 work 方法
 * 
 * @param hashMap 游戏对象的 hash map。如 Game.creeps、Game.spawns 等
 * @param showCpu [可选] 传入指定字符串来启动该 Map 的数量统计
 */
export function doing(...hashMaps: object[]): void {
    hashMaps.forEach((obj, index) => {
        let startCost = Game.cpu.getUsed()

        // 遍历执行 work
        Object.values(obj).forEach(item => {
            if (item.work) item.work()
        })

        // 如果有需求的话就显示 cpu 消耗
        if (Memory.showCost) log(`消耗 ${Game.cpu.getUsed() - startCost}`, [ index.toString() ])
    })
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
 * 全局统计信息扫描器
 * 负责搜集关于 cpu、memory、GCL、GPL 的相关信息
 * 详情见 ./doc/Grafana 统计信息.md
 */
export function stateScanner(): void {
    if (Game.time % 20) return 

    if (!Memory.stats) Memory.stats = { rooms: {} }
    
    // 统计 GCL / GPL 的升级百分比和等级
    Memory.stats.gcl = (Game.gcl.progress / Game.gcl.progressTotal) * 100,
    Memory.stats.gclLevel = Game.gcl.level,
    Memory.stats.gpl = (Game.gpl.progress / Game.gpl.progressTotal) * 100,
    Memory.stats.gplLevel = Game.gpl.level,
    // CPU 的当前使用量
    Memory.stats.cpu = Game.cpu.getUsed(),
    // bucket 当前剩余量
    Memory.stats.bucket = Game.cpu.bucket
    // 统计剩余钱数
    Memory.stats.credit = Game.market.credits
}

/**
 * 全局喊话
 */
export function globalSay(words: string[]) {
    if (!Memory.sayIndex) Memory.sayIndex = 0

    Object.values(Game.creeps).forEach(creep => creep.say(words[Memory.sayIndex], true))

    Memory.sayIndex = Memory.sayIndex + 1 >= words.length ? 0 : Memory.sayIndex + 1
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
 * 创建发送函数到控制台的调用链
 * 
 * @see https://screeps.slack.com/files/U5GS01HT8/FJGTY8VQE/console_button.php
 * @param command 要在游戏控制台执行的方法
 */
function sendCommandToConsole(command: string): string {
    return `angular.element(document.body).injector().get('Console').sendCommand('(${command})()', 1)`
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
 * 把 obj2 的原型合并到 obj1 的原型上
 * 如果原型的键以 Getter 结尾，则将会把其挂载为 getter 属性
 * @param obj1 要挂载到的对象
 * @param obj2 要进行挂载的对象
 */
export const assignPrototype = function(obj1: {[key: string]: any}, obj2: {[key: string]: any}) {
    Object.getOwnPropertyNames(obj2.prototype).forEach(key => {
        if (key.includes('Getter')) {
            Object.defineProperty(obj1.prototype, key.split('Getter')[0], {
                get: obj2.prototype[key],
                enumerable: false,
                configurable: true
            })
        }
        else obj1.prototype[key] = obj2.prototype[key]
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