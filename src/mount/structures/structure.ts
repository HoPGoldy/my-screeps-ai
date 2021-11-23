import { Color } from '@/modulesGlobal'

/**
 * 建筑原型上拓展
 * 会应用到所有建筑上
 */
export default class StructuresExtension extends Structure {
    // 建筑通用的日志方法
    log (content: string, color: Color | undefined = undefined, notify = false): void {
        this.room.log(content, this.structureType, color, notify)
    }
}
