import { createForm } from './createForm'

/**
 * 创建一个包含所有可用表单项的 form 示例
 */
export const getForm = function () {
    return createForm('form 示例', [
        { name: 'myInput', label: '输入框', type: 'input', placeholder: '这是一个输入框' },
        {
            name: 'mySelect',
            label: '下拉框',
            type: 'select',
            options: [
                { value: '0', label: '选项A' },
                { value: '1', label: '选项B' }
            ]
        },
        {
            name: 'myCheckbox',
            label: '复选框',
            type: 'checkbox',
            options: [
                { value: '0', label: '选项A' },
                { value: '1', label: '选项B' }
            ]
        },
        {
            name: 'myRadio',
            label: '单选框',
            type: 'radio',
            options: [
                { value: '0', label: '选项A' },
                { value: '1', label: '选项B' }
            ]
        }
    ], {
        content: '提交',
        // 下面这个函数会被发送到游戏控制台，接受的 data 参数就是输入的表单内容
        command: 'data => \'你提交的数据为 \' + JSON.stringify(data)'
    })
}
