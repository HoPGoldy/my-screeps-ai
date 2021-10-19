import { log, Color } from "./modulesGlobal/console";

export interface ContextGetRoomByName {
    getRoomByName: (roomName: string) => Room | undefined
}

export interface ContextGetCreepByName {
    getCreepByName: (creepName: string) => Creep | undefined
}

export interface ContextGetObjectById {
    getObjectById: <T>(id: Id<T>) => T | undefined
}

export interface ContextGetFlagByName {
    getFlagByName: (flagName: string) => Flag | undefined
}

export interface ContextLog {
    log: typeof log
    colors: typeof Color
}