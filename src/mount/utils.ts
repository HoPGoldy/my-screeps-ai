import { EnvMethods } from "@/contextTypes";
import { green, red, yellow, blue, createLog } from "@/modulesGlobal/console";

/**
 * 创建环境上下文
 * @param moduleName 模块的名字
 */
export const createEnvContext = function (moduleName: string): EnvMethods {
    return {
        getGame: () => Game,
        getRoomByName: roomName => Game.rooms[roomName],
        getCreepByName: creepName => Game.creeps[creepName],
        getFlagByName: flagName => Game.flags[flagName],
        getObjectById: Game.getObjectById,
        log: createLog(moduleName),
        colorful: { green, red, yellow, blue }
    }
}
