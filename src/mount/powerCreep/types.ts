import { Color } from "@/modulesGlobal";

declare global {
    /**
     * PowerCreep 内存拓展
     */
    interface PowerCreepMemory {
        /**
         * 移动缓存
         */
        _go?: MoveInfo
        /**
         * 等同于 Creep.memory.fromShard
         */
        fromShard?: ShardName
        /**
         * pc 暂时没有角色
         */
        role: undefined
        /**
         * 工作的房间名，在第一次出生时由玩家指定，后面会根据该值自动出生到指定房间
         */
        workRoom: string
        /**
         * 同 creep.memory.stand
         */
        stand: boolean
        /**
         * 同 creep.memory.disableCross
         */
        disableCross?: boolean
    }

    /**
     * pc 拓展
     * 来自于 mount.powerCreep.ts
     */
    interface PowerCreep {
        log(content:string, color?: Color, notify?: boolean): void
        goTo(target?: RoomPosition, moveOpt?: MoveOpt): ScreepsReturnCode
        setWayPoint(target: string[] | string): ScreepsReturnCode
    }

}