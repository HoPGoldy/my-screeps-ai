/**
 * HTML 元素基类
 */
interface ElementDetail {
    /**
     * 该元素的 name 属性
     */
    name: string
    /**
     * 该元素的前缀（用于 form 中）
     */
    label?: string
    /**
     * 每个基础元素都要有这个字段来标志自己描述的那个元素
     */
    type: string
}

type HTMLElementDetail = InputDetail | SelectDetail

/**
 * 输入框
 */
interface InputDetail extends ElementDetail {
    /**
     * 提示内容
     */
    placeholder?: string
    type: 'input'
}

/**
 * 下拉框
 */
interface SelectDetail extends ElementDetail {
    /**
     * 下拉框待选项
     */
    options: {
        /**
         * 选项值
         */
        value: string | number
        /**
         * 选项显示内容
         */
        label: string
    }[]
    type: 'select'
}

/**
 * 按钮
 */
interface ButtonDetail {
    /**
     * 按钮显示文本
     */
    content: string
    /**
     * 按钮会执行的命令（可以访问游戏对象）
     */
    command: string
}