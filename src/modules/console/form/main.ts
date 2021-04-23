import template from './template.html'
import style from './style.html'
import { replaceHtml, fixRetraction } from '../utils'
import { HTMLElementDetail, HTMLElements, HTMLCreator, ButtonDetail } from './types'

const [ formTemplate, selectTemplate, optionTemplate, inputTemplate,
    checkboxTemplate, radioTemplate ] = template.split(',,')

/**
 * 所有的 html 元素构造器
 */
const creators: {
    [type in keyof HTMLElements]: (detail: HTMLElements[type]) => string
} = {
    /**
     * 创建 input 输入框
     * @param detail 创建需要的信息
     */
    input({ name, label = '', placeholder = ''}: HTMLElements['input']): string {
        return label + replaceHtml(inputTemplate, { name, placeholder })
    },

    /**
     * 创建 select 下拉框
     * @param detail 创建需要的信息
     */
    select({ name, label = '', options }: HTMLElements['select']): string {
        const optionHtml = options.map(opt => replaceHtml(optionTemplate, opt))
        return label + replaceHtml(selectTemplate, { name, options: optionHtml.join('') })
    }
}

/**
 * 创建表单
 * @param name 表单的名称
 * @param details 表单元素列表
 * @param buttonDetail 按钮的信息
 */
export const createForm = function (name: string, details: HTMLElementDetail[], buttonDetail: ButtonDetail): string {
    // 创建唯一的表单名
    const formName = name + Game.time.toString()

    // 获取所有表单内容
    const elementNames = details.map(({ name }) => `'${name}'`).toString()
    const { content: buttonLabel, command } = buttonDetail
    const formContent = details.map(detail => (creators[detail.type] as HTMLCreator)(detail)).join('')

    const formHtml = style + replaceHtml(formTemplate, {
       formName, formContent, elementNames, command, buttonLabel
    })

    return fixRetraction(formHtml)
}