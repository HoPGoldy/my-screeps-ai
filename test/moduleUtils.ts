import resolve from '@rollup/plugin-node-resolve'
import { InputOptions, OutputOptions, RollupBuild } from 'rollup'
import { readFile } from 'fs'
const { rollup } = require('rollup')
const commonjs = require('@rollup/plugin-commonjs')
const typescript = require('rollup-plugin-typescript2')

/**
 * 构建流程
 */
const plugins = [
    // 打包依赖
    resolve(),
    // 模块化依赖
    commonjs(),
    // 编译 ts
    typescript({ tsconfig: 'tsconfig.json' })
]

/**
 * rollup 编译得到的 bot module
 */
interface BotModule {
    /**
     * 主代码文件
     */
    'main': string
    /**
     * sourceMap 文件
     */
    "main.js.map": string
}

/**
 * 执行模块构建
 * 
 * @param inputPath 构建的入口文件
 * @returns 可以直接用在 bot 中的 module
 */
export const build = async function (input: string): Promise<BotModule> {
    const inputOptions: InputOptions = { input, plugins }
    const outputOptions: OutputOptions = { format: 'cjs', sourcemap: true }

    // 构建模块代码
    const bundle: RollupBuild = await rollup(inputOptions);
    const { output: [targetChunk] } = await bundle.generate(outputOptions);

    // 组装并返回构建成果
    return {
        'main': targetChunk.code,
        'main.js.map': `module.exports = ${targetChunk.map};`
    }
}

/**
 * async 版本的 readFile
 * 
 * @param path 要读取的文件
 * @returns 该文件的字符串内容
 */
const readCode = async function (path: string): Promise<string> {
    return new Promise((resolve, reject) => {
        readFile(path, (err, data) => {
            if (err) return reject(err);
            resolve(data.toString())
        })
    })
}

/**
 * 全局唯一的 dist 代码模块
 */
let myCode: BotModule

/**
 * 获取自己的全量代码模块
 */
export const getMyCode = async function (): Promise<BotModule> {
    if (myCode) return myCode

    const [ main, map ] = await Promise.all([
        readCode('dist/main.js'),
        readCode('dist/main.js.map.js')
    ])

    myCode = { 'main': main, 'main.js.map': map }
    return myCode
}