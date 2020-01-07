/**
 * @author HoPGoldy
 * @source https://www.jianshu.com/p/333795b9893f
 * @date 2020-1-7
 * 
 * 统计指定目录下代码行数及注释率
 * 
 * 用法: node count.js <路径> [后缀名]...
 * 后缀名不填的话默认为统计 .js 和 .ts 文件
 * 
 * 示例 [统计 ./src 下的 js 文件]: node count.js ./src
 * 示例 [统计 ./dist 下的 java 文件]: node count.js ./src .java
 */

const fs = require('fs')
let path = require('path')

// 获取命令行参数
const parm = process.argv.splice(2)
// 第一个参数是路径
const rootPath = parm[0]
// 后面的所有参数都是文件后缀
let types = parm.splice(1)
if (types.length === 0) types = [ '.js', '.ts' ]
// 需要过滤的文件夹
const filter = [ './node_modules', './.git', './.tscache' ]
// 统计结果
let total = {
    path: 'total',
    length: 0,
    comment: 0,
    commentRatio: 1
}
// 统计结果
let result = []

/**
 * 对指定文件进行统计
 * 包括获取文件行数、注释及计算注释率
 * 
 * @param {string} path 文件路径
 */
async function count(path) {
    const rep = await fs.readFileSync(path).toString()
    const lines = rep.split('\n')

    // 匹配出注释的行数
    const commentNum = lines.filter(line => new RegExp('^(//|/\\*|\\*|\\*/)', 'g').test(line.trimStart())).length

    result.push({
        path,
        length: lines.length,
        comment: commentNum,
        commentRatio: (Math.round(commentNum/lines.length * 10000) / 100) + '%'
    })

    updateTotal(lines.length, commentNum)
}

/**
 * 更新总计信息
 * 
 * @param {number} length 新增行数
 * @param {number} comment 新增注释
 */
function updateTotal(length, comment) {
    total.length += length
    total.comment += comment
    total.commentRatio = (Math.round(total.comment/total.length * 10000) / 100) + '%'
}

/**
 * 递归所有文件夹统计
 * 
 * @param {string} pt 根目录
 */
async function start(pt) {
    fs.readdirSync(pt).map(file => `${pt}/${file}`)
        .forEach(file => {
            const stat = fs.statSync(file)
            // 是文件夹就递归
            if (stat.isDirectory()) {
                if (filter.indexOf(pt) != -1) return
                return start(file)
            }
            // 是文件并且后缀名符合就执行统计
            if (types.indexOf(path.extname(file)) != -1) count(file)
        })
}

;(async () => {
    await start(rootPath)
    result.push(total)
    console.table(result)
})()