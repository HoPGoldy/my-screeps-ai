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
 */
export const fixRetraction = function (html: string): string {
    return html.replace(/\n/g, '')
}
