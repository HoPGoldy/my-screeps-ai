import { createLog, green, red, yellow, blue } from "./modulesGlobal/console";

export interface EnvMethods {
    getGame: () => Game
    getRoomByName: (roomName: string) => Room | undefined
    getCreepByName: (creepName: string) => Creep | undefined
    getObjectById: <T>(id: Id<T>) => T | undefined
    getFlagByName: (flagName: string) => Flag | undefined
    log: ReturnType<typeof createLog>
    colorful: {
        green: typeof green
        red: typeof red
        yellow: typeof yellow
        blue: typeof blue
    }
}

export interface EnvContext {
    env: EnvMethods
}
