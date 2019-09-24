// 路径名到颜色的对应列表
const pathMap: IPathMap = {
    default: '#ffffff',
    havest: '#CCFF99',
    upgrade: '#99CCFF',
    build: '#FFCC99',
    repair: '#000099',
    attack: '#DC143C', // 猩红
    claimer: 'Indigo' //靛青
}

/**
 * 通过路径名称获取 visualizePathStyle
 * 
 * @param pathName 路径的名称
 * @returns 包含可视化路径的对象
 */
export function getPath (pathName: string='default'): MoveToOpts {
    const pathColor: string = (pathName in pathMap) ? 
        pathMap[pathName] : 
        pathMap['default']
    
    return {
        visualizePathStyle: {
            stroke: pathColor
        }
    }
}

/**
 * 死亡 creep 记忆清除
 * 每 1000 tick 执行一次清理
 */
export function clearDiedCreep (): boolean {
    // 每 1000 tick 执行一次
    if (Game.time % 1000) return false

    for(const name in Memory.creeps) {
        if(!Game.creeps[name]) {
            delete Memory.creeps[name]
            console.log('清除死去蠕虫记忆', name)
        }
    }
    return true
}

/**
 * 获取自己控制的房间名
 * "自己控制": 有自己 spawn 的房间
 * 使用 lodash uniq 方法去重
 * 
 * @returns {list} 自己占领的房间名列表
 */
export function getRoomList (): string[] {
    let rooms: string[] = []
    for (const spawnName in Game.spawns) {
        rooms.push(Game.spawns[spawnName].room.name)
    }
    return _.uniq(rooms)
}