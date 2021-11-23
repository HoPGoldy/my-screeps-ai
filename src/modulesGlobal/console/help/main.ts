import template from './template.html'
import style from './style.html'
import { replaceHtml, fixRetraction, yellow, green, blue } from '../utils'
import { ModuleDescribe, FunctionDescribe } from './types'

const [moduleContainerTemplate, moduleTemplate, apiContainerTemplate, apiLineTemplate] = template.split(';;')

/**
 * 创建帮助信息
 * 给帮助的显示添加一点小细节
 *
 * @param modules 模块的描述
 */
export const createHelp = function (...modules: ModuleDescribe[]): string {
    const content = modules.map(createModule).join('')
    const helpHtml = style + replaceHtml(moduleContainerTemplate, { content })

    return fixRetraction(helpHtml)
}

/**
 * 创建模块帮助
 *
 * @param module 要创建的模块描述对象
 * @returns 模块帮助 html 文本
 */
const createModule = function (module: ModuleDescribe): string {
    return replaceHtml(moduleTemplate, {
        title: yellow(module.name),
        describe: green(module.describe),
        functionList: module.api.map(createApiHelp).join('')
    })
}

/**
 * 绘制单个 api 的帮助元素
 *
 * @param func api 的描述信息
 * @returns 绘制完成的字符串
 */
const createApiHelp = function (func: FunctionDescribe): string {
    const contents: string[] = []
    // 如果有 api 介绍
    if (func.describe) contents.push(green(func.describe))

    // 如果有参数介绍
    if (func.params) {
        // 把描述信息格式为字符串
        const describes = func.params.map(param => {
            return `  - ${blue(param.name)}: ${green(param.desc)}`
        })

        // 把字符串更新为 html 片段
        contents.push(describes.map(content => {
            return replaceHtml(apiLineTemplate, { content })
        }).join(''))
    }

    // 函数示例中的参数
    const paramInFunc = func.params ? func.params.map(param => blue(param.name)).join(', ') : ''
    // 如果启用了命令模式的话就忽略其参数
    const funcCall = yellow(func.functionName) + (func.commandType ? '' : `(${paramInFunc})`)

    // 函数示例
    contents.push(funcCall)

    const content = contents.map(content => replaceHtml(apiLineTemplate, { content })).join('')
    const checkboxId = `${func.functionName}${Game.time}`

    // 将内容装载进 html
    return replaceHtml(apiContainerTemplate, {
        checkboxId,
        content,
        title: `${func.title} ${yellow(func.functionName, true)}`
    })
}
