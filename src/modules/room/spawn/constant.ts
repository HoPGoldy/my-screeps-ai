// 用于维持房间能量正常运转的重要角色
export const importantRoles: CreepRoleConstant[] = [ 'harvester', 'manager', 'processor' ]

// creep 的默认内存
export const creepDefaultMemory: CreepMemory = {
    role: 'worker',
    ready: false,
    working: false,
    spawnRoom: 'W1N1'
}