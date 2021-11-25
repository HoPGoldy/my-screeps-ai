# 控制台 HTML 格式化模块

该模块提供了以 html 形式输出内容到游戏控制台的能力。**需要 rollup 插件 rollup-plugin-html 的支持**。

## 创建帮助 & 创建表单

本模块内建了如下两个功能：

- **帮助**：在控制台创建一个模块帮助信息，位于 `./help/main.ts`
- **表单**：在控制台创建一个简单的单行表单，位于 `./form/main.ts`，在 `./form/example.ts` 中包含一个使用示例。

你可以通过调用指定方法并传入一个纯 js 对象的形式快捷生成对应的 html 文本。

## 手动创建

除了使用上面的内建功能之外，你也可以通过直接创建一个 html 文件的形式来自定义自己的控制台美化。如下是创建流程：

新建 `xxx.html`，并填入你想要显示的 html 内容，如下：

```html
<div style="color: red; font-size: 20px;">这是一段超级红的文本</div>
```

然后在代码文件中将其引入，之后就可以像使用一个字符串一样对其进行处理。或者你也可以直接使用 console.log 将其输出到控制台中，会直接以 html 形式展示。

```js
import htmlContent from './xxx.html'

console.log(typeof htmlContent) // ==> string
```

## 工具函数

你可以使用 `./utils.ts` 中提供的工具函数简化开发，下面对其进行简单介绍：

### 模板替换 `replaceHtml`

在绝大多数场景下，都需要对 html 内容进行自定义，你可以使用 replaceHtml 函数进行内容替换，操作如下：

新建 html 文件，并使用大括号指定占位符：`{content}`

```html
<div style="color: {color}; font-size: 20px;">{content}</div>
```

然后在代码文件中引入 html 及 `replaceHtml`，然后就可以通过给 replaceHtml 第二个参数传入一个对象的形式来为指定占位符插入内容。

```js
import htmlTemplate from './xxx.html'
import { replaceHtml } from '@/modules/console'

const func = function () {
    return replaceHtml(htmlTemplate, {
        content: '这是一段超级红的文本',
        color: Color.Red
    })
}
```

### 报错修复 `fixRetraction`

当 **html 片段中内嵌了 js 内容的话**，rollup 的 js 压缩将无法正确执行，此时可能会导致对应的 js 执行出错，可以通过 fixRetraction 修复报错问题。

**注意，html 中出现的 js 代码都要附带分号结尾。**

