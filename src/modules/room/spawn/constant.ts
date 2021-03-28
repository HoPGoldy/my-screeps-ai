// 用于维持房间能量正常运转的重要角色
export const importantRoles: CreepRoleConstant[] = [ 'harvester', 'manager', 'processor' ]

// creep 的默认内存
export const creepDefaultMemory: CreepMemory = {
    role: 'worker',
    ready: false,
    working: false,
    spawnRoom: 'W1N1'
}

/**
 * 房间运营单位的限制，自动调整时不会超过这个区间
 */
export const BASE_ROLE_LIMIT: RoomBaseUnitLimit = {
    worker: {
        MAX: Infinity,
        MIN: 1
    },
    manager: {
        MAX: 5,
        MIN: 1
    }
}