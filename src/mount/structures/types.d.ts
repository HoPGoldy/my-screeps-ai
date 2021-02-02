/**
 * 建筑拓展
 */
interface Structure {
    // 是否为自己的建筑，某些建筑不包含此属性，也可以等同于 my = false
    my?: boolean
    /**
     * 发送日志
     * 
     * @param content 日志内容
     * @param instanceName 发送日志的实例名
     * @param color 日志前缀颜色
     * @param notify 是否发送邮件
     */
    log(content:string, color?: Colors, notify?: boolean): void
    /**
     * 建筑的主要工作入口
     */
    work?(): void
    /**
     * 建筑在完成建造时触发的回调
     */
    onBuildComplete?(): void
}

interface StructureController {
    /**
     * 检查房间内敌人是否有威胁
     */
    checkEnemyThreat(): boolean
}

interface StructurePowerSpawn {
    /**
     * 查看状态
     */
    stats(): string
}

interface StructureLink {
    onWork(): void
    asCenter(): string
    asSource(): string
    asUpgrade(): string
}
