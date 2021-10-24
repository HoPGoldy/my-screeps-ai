import { log, Color } from "./modulesGlobal/console";

export interface EnvContext {
    env: {
        getGame: () => Game
        getRoomByName: (roomName: string) => Room | undefined
        getCreepByName: (creepName: string) => Creep | undefined
        getObjectById: <T>(id: Id<T>) => T | undefined
        getFlagByName: (flagName: string) => Flag | undefined
        log: typeof log
        colors: typeof Color
    }
}