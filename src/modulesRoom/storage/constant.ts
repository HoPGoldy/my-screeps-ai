/**
 * 资源平衡配置
 * 当 terminal 中的资源不等于这个值时将进行平衡
 */
export const BALANCE_CONFIG: { [res in ResourceConstant]?: number } = {
    [RESOURCE_ENERGY]: 2000
}

/**
 * 默认的平衡数量
 * 当某个资源在上表中没有指定平衡数量时，将使用这个数量
 */
export const DEFAULT_BALANCE_LIMIT = 10000

/**
 * 房间 storage 中的数量超过下面值时
 * 该房间就会将自己注册为能量共享的提供房间
 */
export const ENERGY_SHARE_LIMIT = 600000

/**
 * storage 中能量数量低于该值时将请求资源共享协议获取能量
 * 仅在房间有 terminal 时生效
 */
export const ENERGY_REQUEST_LIMIT = 200000
