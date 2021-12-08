import clear from 'rollup-plugin-clear'
import resolve from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import typescript from 'rollup-plugin-typescript2'
import screeps from 'rollup-plugin-screeps'
import copy from 'rollup-plugin-copy'
import html from 'rollup-plugin-html'

const banner = `/***
 * SCREEPS-HOHO-BOT
 *
 * >>> 在控制台输入 help 来查看更多帮助信息 <<<
 *
 * >>> 如何放置第一个 Spawn <<<
 * 第一步：在房间中找到一块 11*11 的空地
 * 第二步：在这个空地左上角右二下三的位置即为 Spawn 放置点（见下图）
 * 
 * ▨▢▢
 * ▢▢▢
 * ▢▢▢
 * ▢▢▣ < 这里就是 sapwn 放置点
 */
`

let config
// 根据指定的目标获取对应的配置项
if (!process.env.DEST) console.log('未指定目标, 代码将被编译但不会上传')
else if (!(config = require('./.secret.json')[process.env.DEST])) {
    throw new Error('无效目标，请检查 secret.json 中是否包含对应配置')
}

// 根据指定的配置决定是上传还是复制到文件夹
const deployPlugin = config && config.copyPath
    // 复制到指定路径
    ? copy({
        targets: [
            {
                src: 'dist/main.js',
                dest: config.copyPath
            },
            {
                src: 'dist/main.js.map',
                dest: config.copyPath,
                rename: name => name + '.map.js',
                transform: contents => `module.exports = ${contents.toString()};`
            }
        ],
        hook: 'writeBundle',
        verbose: true
    })
    // 更新 .map 到 .map.js 并上传
    : screeps({ config, dryRun: !config })

export default {
    input: 'src/main.ts',
    output: {
        file: 'dist/main.js',
        format: 'cjs',
        banner,
        sourcemap: true
    },
    plugins: [
        // 清除上次编译成果
        clear({ targets: ['dist'] }),
        // 打包依赖
        resolve(),
        // 模块化依赖
        commonjs(),
        // 构建可能存在的 html 文件
        html({
            include: '**/*.html',
            htmlMinifierOptions: {
                collapseWhitespace: true,
                collapseInlineTagWhitespace: true,
                minifyCSS: true,
                removeComments: true
            }
        }),
        // 编译 ts
        typescript({ tsconfig: './tsconfig.json' }),
        // 执行上传或者复制
        deployPlugin
    ]
}
