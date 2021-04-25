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

/**
 * 所有的 html 元素描述对象
 */
export type HTMLElementDetail = HTMLElements[keyof HTMLElements]

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
        value: string
        /**
         * 选项显示内容
         */
        label: string
    }[]
    type: 'select'
}

/**
 * 单选框
 */
 interface RadioDetail extends ElementDetail {
    /**
     * 待选项
     */
    options: {
        /**
         * 选项值
         */
        value: string
        /**
         * 选项显示内容
         */
        label: string
    }[]
    type: 'radio'
}

/**
 * 复选框
 */
 interface CheckboxDetail extends ElementDetail {
    /**
     * 待选项
     */
    options: {
        /**
         * 选项值
         */
        value: string
        /**
         * 选项显示内容
         */
        label: string
    }[]
    type: 'checkbox'
}

/**
 * 按钮
 */
export interface ButtonDetail {
    /**
     * 按钮显示文本
     */
    content: string
    /**
     * 按钮会执行的命令（可以访问游戏对象）
     */
    command: string
}

/**
 * 所有的 html 元素描述对象
 */
export interface HTMLElements {
    input: InputDetail
    select: SelectDetail
    checkbox: CheckboxDetail
    radio: RadioDetail
}

/**
 * 所有 html 元素的构造器
 */
export type HTMLCreator = (detail: HTMLElements[keyof HTMLElements]) => string
