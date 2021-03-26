/**
 * 自定义移动的选项
 */
interface MoveOpt {
    /**
     * 重用距离，等同于 moveTo 的 reusePath
     */
    reusePath?: number
    /**
     * 要移动到目标位置的距离
     */
    range?: number
    /**
     * 是否禁用对穿（为 true 则会躲避 creep，默认为 false）
     */
    disableCross?: boolean
    /**
     * 移动目标所在的 shard（不填则默认为本 shard）
     */
    shard?: ShardName
    /**
     * 路径点
     * 传入形如 [ '12 21 E1N1', '12 21 E2N2' ] 的路径点数组
     * 或是任意路径旗帜名前缀
     */
    wayPoint?: string[] | string
    /**
     * 最大的搜索成本
     */
    maxOps?: number
    /**
     * 是否检查目标发生了变化，为 true 的话会每 tick 检查目标位置是否变化
     * 一旦变化则会立刻重新查找移动路线，默认为 true
     */
     checkTarget?: boolean
    /**
     * 是否禁用路径缓存
     * 当 creep 因为对方拒绝对穿而重新寻路时，就需要开启该选项
     * 否则如果恰好有缓存的路径经过了拒绝对穿者，那该 creep 就会由于使用了该缓存从而不停的撞击拒绝对穿的单位
     */
    disableRouteCache?: boolean
}

/**
 * 移动的内存数据
 */
interface MoveInfo {
    /**
     * 序列化之后的路径信息
     */
    path?: string
    /**
     * 上一个位置信息，形如"14/4"，用于在 creep.move 返回 OK 时检查有没有撞停
     */
    prePos?: string
    /**
     * 上一次移动的方向，用于在下个 tick 发现移动失败时检查前面时什么东西
     * 同时也代表这个 creep 正处在移动之中（移动到目的地后会将该字段删除）
     */
    lastMove?: DirectionConstant
    /**
     * 要移动到的目标位置，creep 会用这个字段判断目标是否变化了
     */
    targetPos?: string
    /**
     * 数组形式传入的路径点
     */
    wayPoints?: string[]
    /**
     * 路径旗帜名（包含后面的编号，如 waypoint1 或者 waypoint99）
     */
    wayPointFlag?: string
}

/**
 * 是否允许对穿
 * 
 * @param creep 被对穿的 creep
 * @param requireCreep 发起对穿的 creep
 * @return 为 true 时允许对穿
 */
type AllowCrossRuleFunc = (creep: Creep | PowerCreep, requireCreep: Creep | PowerCreep) => boolean

/**
 * 对穿请求的规则集合
 * 
 * 键为 creep 的角色类型，值为一个返回 boolean 的方法
 * 该方法用于判断有其他 creep 向该 creep 发起对穿时是否同意对穿，在寻路时也会使用该方法确定是否要绕过一个 creep
 * 该方法为空则使用默认规则（键为 default）
 */
type CrossRules = {
    [role in CreepRoleConstant | 'default']?: AllowCrossRuleFunc
}
