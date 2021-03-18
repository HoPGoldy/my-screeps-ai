import { getMock } from './utils'

// 伪造 visual 的默认值
class VisualMock {
    line = () => this
    circle = () => this
    rect = () => this
    poly = () => this
    text = () => this
    clear = () => this
    getSize = () => 1
    export = () => 'export'
    import = () => this
}

/**
 * 伪造一个 creep
 * @param props 该 creep 的属性
 */
export const getMockVisual = getMock<RoomVisual>(VisualMock)
