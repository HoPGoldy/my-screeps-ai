import { colorful } from "./utils"

/**
 * 给函数的显示添加一点小细节
 * 只会用在各种 help 方法中
 * 
 * @param functionInfo 函数的信息
 */
export function createHelp(module: ModuleDescribe): string {
    const functionList = module.api.map(createApiHelp)
    
    return apiStyle + functionList.join('\n')
}

const createApiHelp = function(func: FunctionDescribe): string {
    // 标题
    const title = colorful(func.title, 'green')
    // 参数介绍
    const param = func.params ? 
        func.params.map(param => `  - ${colorful(param.name, 'blue')}: ${colorful(param.desc, 'green')}`).join('\n') : ''
    // 函数示例中的参数
    const paramInFunc = func.params ? 
        func.params.map(param => colorful(param.name, 'blue')).join(', ') : ''
    // 函数示例
    const functionName = `${colorful(func.functionName, 'yellow')}(${paramInFunc})`

    const checkboxId = `${func.functionName}${Game.time}`

    // return func.params ? `${title}\n${param}\n${functionName}\n` : `${title}\n${functionName}\n`

    return `
    <div class="container">
    <label for="${checkboxId}">${func.title} ${functionName}</label>
    <input id="${checkboxId}" type="checkbox" />
    <div class="content">
        <div>介绍</div>
        <div>参数特别多多多多多多多多多多</div>
        <div>返回值</div>
    </div>
    </div>
    `
}

const apiStyle = `
<style>
label {
    transition: all 0.1s;
    min-width: 300px;
}
.container {
    margin: 10px;
    width: 250px;
    background-color:#f2f2f2;
    overflow: hidden;
}

/* 隐藏input */
input {
    display: none;
}

label {
    cursor: pointer;
    display: block;
    margin: 0 0 0 -50px;
    padding: 15px 10px 15px 70px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.container label:hover, label:focus {
    background-color:#a7a7a7;
    color:#fff;
}

/* 清除所有展开的子菜单的 display */
.container input + .content {
    transition: all 0.1s;
    width: auto;
    max-height: 0px;
    padding: 0px 10px
}

/* 当 input 被选中时，给所有展开的子菜单设置样式 */
.container input:checked + .content {
    max-height: 200px;
    padding: 10px
}
</style>`