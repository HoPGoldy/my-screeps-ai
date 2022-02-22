interface ReplaceContent {
    [placeholder: string]: string
}

/**
 * 将内容插入到 html 模板
 *
 * @param html 要进行替换的模板 html
 * @param replaceContent 要替换的内容
 * @returns 替换完成的 html 内容
 */
export const replaceHtml = function (html: string, replaceContent: ReplaceContent = {}): string {
    // 替换所有占位符
    return Object.keys(replaceContent).reduce((html, nextKey) => {
        return html.replace(new RegExp(`{${nextKey}}`, 'g'), replaceContent[nextKey])
    }, html)
}

/**
 * 修复 js 内容缩进引起的问题
 *
 * @param html 要进行修复的 html 字符串
 * @returns 修复完成的 html 字符串
 */
export const fixRetraction = function (html: string): string {
    return html.replace(/\n/g, '')
}

/**
 * 支持的控制台显示颜色
 */
export enum Color {
    Red = 1,
    Green,
    Yellow,
    Blue
}

/**
 * 在绘制控制台信息时使用的颜色
 */
const COLOR_VALUE: { [name in Color]: string } = {
    [Color.Red]: '#ef9a9a',
    [Color.Green]: '#6b9955',
    [Color.Yellow]: '#c5c599',
    [Color.Blue]: '#8dc5e3'
}

/**
 * 给指定文本添加颜色
 *
 * @param content 要添加颜色的文本
 * @param colorName 要添加的颜色常量字符串
 * @param bolder 是否加粗
 */
export const colorful = function (content: string | number, colorName: Color = null, bold = false): string {
    const colorStyle = colorName ? `color: ${COLOR_VALUE[colorName]};` : ''
    const boldStyle = bold ? 'font-weight: bold;' : ''

    return `<text style="${[colorStyle, boldStyle].join(' ')}">${content}</text>`
}

export const green = (content: string | number, bold?: boolean) => colorful(content, Color.Green, bold)
export const red = (content: string | number, bold?: boolean) => colorful(content, Color.Red, bold)
export const yellow = (content: string | number, bold?: boolean) => colorful(content, Color.Yellow, bold)
export const blue = (content: string | number, bold?: boolean) => colorful(content, Color.Blue, bold)
export const bold = (content: string | number) => colorful(content, null, true)

/**
 * 生成控制台链接
 * @param content 要显示的内容
 * @param url 要跳转到的 url
 * @param newTab 是否在新标签页打开
 */
export function createLink (content: string, url: string, newTab = true): string {
    return `<a href="${url}" target="${newTab ? '_blank' : '_self'}">${content}</a>`
}

/**
 * 给房间内添加跳转链接
 *
 * @param roomName 添加调整链接的房间名
 * @param padEnd 要在左侧添加对齐空格的长度
 * @returns 打印在控制台上后可以点击跳转的房间名
 */
export function createRoomLink (roomName: string): string {
    return createLink(roomName, `https://screeps.com/a/#!/room/${Game.shard.name}/${roomName}`, false)
}

/**
 * 快捷生成单个常量帮助
 *
 * @param name 常量简称
 * @param constant 常量名
 */
export function createConst (name: string, constant: string): string {
    return `${colorful(name, Color.Green)} ${colorful(constant, Color.Blue)}`
}

/**
 * 全局日志
 *
 * @param content 日志内容
 * @param prefix 日志前缀
 * @param color 日志前缀颜色
 * @param notify 是否发送邮件
 */
export function log (content: string, prefix = '', color: Color = null, notify = false): void {
    // 有前缀就组装在一起
    const prefixContent = prefix ? `【${prefix}】 ` : ''
    // 指定了颜色
    prefix = colorful(prefixContent, color, true)

    const logContent = `${prefix}${content}`
    console.log(logContent)
    // 转发到邮箱
    if (notify) Game.notify(logContent)
}

/**
 * 生成快捷日志方法
 * @param prefix 模块日志前缀
 */
export const createLog = (prefix: string) => ({
    normal: (content: string, notify = false) => log(content, prefix, null, notify),
    success: (content: string, notify = false) => log(content, prefix, Color.Green, notify),
    warning: (content: string, notify = false) => log(content, prefix, Color.Yellow, notify),
    error: (content: string, notify = true) => log(content, prefix, Color.Red, notify)
})
