import { createForm } from '@/modules/console'

export const getForm = function () {
    return createForm('form 示例', [
        { name: 'myInput', label: '输入框', type: 'input', placeholder: '这是一个输入框' },
        { name: 'mySelect', label: '下拉框', type: 'select', options: [
            { value: '0', label: '选项A' },
            { value: '1', label: '选项B' }
        ]},
        { name: 'myCheckbox', label: '复选框', type: 'checkbox', options: [
            { value: '0', label: '选项A' },
            { value: '1', label: '选项B' }
        ]},
        { name: 'myRadio', label: '单选框', type: 'radio', options: [
            { value: '0', label: '选项A' },
            { value: '1', label: '选项B' }
        ]},
    ], {
        content: '提交',
        command: `data => '你提交的数据为 ' + JSON.stringify(data)`
    })
}
