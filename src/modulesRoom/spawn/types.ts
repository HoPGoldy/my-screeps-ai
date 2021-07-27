import { CreepRole, RoleDatas } from "@/role/types/role"

declare global {
    interface RoomMemory {
        /**
         * 该房间的孵化队列数据
         */
        spawnList: string
        /**
         * 该房间的基础运维单位上下限
         * 不存在时将使用 ./constant.ts 中的 BASE_ROLE_LIMIT
         */
        baseUnitLimit?: RoomBaseUnitLimit
    }
}

/**
 * 孵化任务
 */
export interface SpawnTask<Role extends CreepRole = CreepRole> {
    /**
     * 要孵化的 creep 名称
     */
    name: string
    /**
     * 该 Creep 的角色
     */
    role: Role
    /**
     * 该 creep 所需的 data
     */
    data: RoleDatas[Role],
}

/**
 * 当 creep 不需要生成时 mySpawnCreep 返回的值
 */
 export type CREEP_DONT_NEED_SPAWN = -101

/**
 * spawn.mySpawnCreep 方法的返回值集合
 */
export type MySpawnReturnCode = ScreepsReturnCode | CREEP_DONT_NEED_SPAWN

/**
 * 房间运维基础单位
 */
export type BaseUnits = CreepRole.Worker | CreepRole.Manager

/**
 * 房间基础运维单位的动态调整上下限
 * 用于规定不同时期动态调整的范围
 */
export type BaseUnitLimit = {
    MAX: number
    MIN: number
}

/**
 * 房间内所有基础单位的限制
 */
export type RoomBaseUnitLimit = {
    [role in BaseUnits]: BaseUnitLimit
}