import { SourceMapConsumer } from "source-map"
import { colorful } from '../utils'

export class ErrorMapper {
    // 进行缓存
    private static _consumer?: SourceMapConsumer;

    public static get consumer(): SourceMapConsumer {
        if (this._consumer == null) this._consumer = new SourceMapConsumer(require("main.js.map"))
        return this._consumer
    }

    // 缓存映射关系以提高性能
    public static cache: { [key: string]: string } = {};

    /**
     * 使用源映射生成堆栈跟踪，并生成原始标志位
     * 警告 - global 重置之后的首次调用会产生很高的 cpu 消耗 (> 30 CPU)
     * 之后的每次调用会产生较低的 cpu 消耗 (~ 0.1 CPU / 次)
     *
     * @param {Error | string} error 错误或原始追踪栈
     * @returns {string} 映射之后的源代码追踪栈
     */
    public static sourceMappedStackTrace(error: Error | string): string {
        const stack: string = error instanceof Error ? (error.stack as string) : error
        // 有缓存直接用
        if (this.cache.hasOwnProperty(stack)) return this.cache[stack]

        const re = /^\s+at\s+(.+?\s+)?\(?([0-z._\-\\\/]+):(\d+):(\d+)\)?$/gm
        let match: RegExpExecArray | null
        let outStack = error.toString()

        while ((match = re.exec(stack))) {
            // 解析完成
            if (match[2] !== "main") break
            
            // 获取追踪定位
            const pos = this.consumer.originalPositionFor({
                column: parseInt(match[4], 10),
                line: parseInt(match[3], 10)
            })

            // 无法定位
            if (!pos.line) break
            
            // 解析追踪栈
            if (pos.name) outStack += `\n    at ${pos.name} (${pos.source}:${pos.line}:${pos.column})`
            else {
                // 源文件没找到对应文件名，采用原始追踪名
                if (match[1]) outStack += `\n    at ${match[1]} (${pos.source}:${pos.line}:${pos.column})`
                // 源文件没找到对应文件名并且原始追踪栈里也没有，直接省略
                else outStack += `\n    at ${pos.source}:${pos.line}:${pos.column}`
            }
        }

        this.cache[stack] = outStack
        return outStack
    }

    /**
     * 错误追踪包装器
     * 用于把报错信息通过 source-map 解析成源代码的错误位置
     * 
     * @param loop 玩家代码主循环
     */
    public static wrapLoop(loop: () => void): () => void {
        return () => {
            try {
                // 执行玩家代码
                loop()
            }
            catch (e) {
                if (e instanceof Error) {
                    // 渲染报错调用栈，沙盒模式用不了这个
                    const errorMessage = Game.rooms.sim ?
                        `沙盒模式无法使用 source-map - 显示原始追踪栈<br>${_.escape(e.stack)}` :
                        `${_.escape(this.sourceMappedStackTrace(e))}`
                    
                    console.log(colorful(errorMessage, 'red'))
                }
                // 处理不了，直接抛出
                else throw e
            }
        }
    }
}