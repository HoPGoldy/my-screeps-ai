/**
 * 绘制帮助时需要的模块信息
 */
export interface ModuleDescribe {
    /**
     * 模块名
     */
    name: string
    /**
     * 模块介绍
     */
    describe: string
    /**
     * 该模块的 api 列表
     */
    api: FunctionDescribe[]
}

/**
 * 描述一个函数
 */
export interface FunctionDescribe {
    /**
     * 函数的名字
     */
    title: string
    /**
     * 函数如何使用
     */
    describe?: string
    /**
     * 参数列表
     * 置空则没有参数
     */
    params?: {
        /**
         * 参数名
         */
        name: string
        /**
         * 参数介绍
         */
        desc: string
    }[]
    /**
     * 函数的方法名
     */
    functionName: string
    /**
     * 是否可以直接执行：不需要使用 () 就可以执行的命令
     */
    commandType?: boolean
}
