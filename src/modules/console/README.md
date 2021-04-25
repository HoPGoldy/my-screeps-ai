# 控制台 HTML 格式化模块

该模块提供了以 html 形式输出到控制台的能力。**需要 rollup 插件 rollup-plugin-html 的支持**。

## 创建帮助 & 创建表单

本模块内建了如下两个功能：

- 在控制台创建一个模块帮助信息（位于 `src\modules\console\hekp\main.ts`）
- 在控制台创建一个简单的单行表单（位于 `src\modules\console\form\main.ts`）

你可以通过调用指定方法并传入一个纯 js 对象的形式快捷生成对应的 html 文本。

## 手动创建

除了使用上面的内建功能之外，你也可以通过直接创建一个 html 文件的形式来自定义自己的控制台美化。
