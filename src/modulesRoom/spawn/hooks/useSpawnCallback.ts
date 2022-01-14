/**
 * 包含房间 spawn 回调绑定的相关方法
 */
export const useSpawnCallback = function () {
    /**
     * 角色的回调列表
     */
    const spawnCallbacks: Record<string, (creep: Creep) => unknown> = {}

    /**
     * 绑定孵化回调
     * 将会在角色孵化后触发通过本方法绑定的同角色回调
     * 应当在全局重置时绑定
     *
     * @param role 要绑定到的角色
     * @param callbackFunc 对应角色孵化后触发的回调
     */
    const addSpawnCallback = function (role: string, callbackFunc: (creep: Creep) => unknown) {
        spawnCallbacks[role] = callbackFunc
    }

    /**
     * 针对某个刚孵化好的 creep 调用对应的回调
     * 内部方法
     */
    const runSpawnCallback = function (role: string, creep: Creep) {
        spawnCallbacks[role]?.(creep)
    }

    return { addSpawnCallback, runSpawnCallback }
}
