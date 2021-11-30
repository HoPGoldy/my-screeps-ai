import { createLog, green, red, yellow, blue } from './console'

export interface EnvMethods {
    getGame: () => Game
    getRoomByName: (roomName: string) => Room | undefined
    getCreepByName: (creepName: string) => Creep | undefined
    getObjectById: typeof Game.getObjectById
    getFlagByName: (flagName: string) => Flag | undefined
    inInterval: (interval: number) => boolean
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

/**
 * 所有包含 id 字段的游戏对象
 */
export interface ObjectWithId<T = unknown> extends RoomObject {
    id: Id<T>
}
