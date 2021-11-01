import { createCache, createTileMap, RoomTileMap, getRangeIndex } from "@/utils"
import { RoomInfo } from "../types"
import { getCreepDamage } from "../utils"

/**
 * 创建房间地方伤害值
 * 包含缓存
 */
export const useRoomEnemyDamage = function (getRoomInfo: (roomName: string) => RoomInfo | undefined) {
    const createTowerDamageCost = function (roomName: string): RoomTileMap<number> | undefined {
        const { tower } = getRoomInfo(roomName) || {}
        if (!tower) return undefined

        const terrain = new Room.Terrain(roomName);

        return createTileMap((x, y) => {
            if (terrain.get(x, y) === TERRAIN_MASK_WALL) return -1
            return getAllTowerDamage(tower, new RoomPosition(x, y, roomName))
        })
    }

    const createRoomTowerNumber = function (roomName: string): number {
        const { tower } = getRoomInfo(roomName) || {}
        return tower ? tower.length : 6
    }

    const [getTowerDamage, refrshTowerDamage] = createCache(createTowerDamageCost)
    const [getTowerNumber, refrshTowerNumber] = createCache(createRoomTowerNumber)

    const createRoomEnemyDamage = function (roomName: string): RoomTileMap<number> | undefined {
        const { tower, hostileCreeps } = getRoomInfo(roomName) || {}
        if (!tower) return undefined
        
        // 如果房间里的 tower 数量变了，就移除 tower 伤害缓存
        if (tower.length !== getTowerNumber(roomName)) {
            refrshTowerDamage()
            refrshTowerNumber()
        }

        // 深拷贝一下，防止修改了缓存内容
        const enemyDamage = getTowerDamage(roomName).clone()

        hostileCreeps.map(creep => {
            const [nearDamage, rangeDamage] = getCreepDamage(creep)

            const xs = getRangeIndex(creep.pos.x, 4)
            const ys = getRangeIndex(creep.pos.y, 4)
            xs.forEach(x => ys.forEach(y => {
                const tileTowerDamge = enemyDamage.get(x, y)
                // -1 代表这个位置是墙壁，是刚才塔伤计算时给出的，不计算伤害
                if (tileTowerDamge === -1) return

                // 在 5*5 的范围内就累加上近战伤害
                // 是 5*5 而不是 3*3 的原因是，下个 tick 对面的爬有可能会移动一格，就导致实际的攻击范围是移动范围再加上攻击范围的
                if (Math.abs(x - creep.pos.x) <= 2) enemyDamage.set(x, y, tileTowerDamge + nearDamage)
                // 否则就应用远程伤害
                else enemyDamage.set(x, y, tileTowerDamge + rangeDamage)
            }))
        })

        // 解除下面的注释来显示房间伤害
        enemyDamage.map((x, y, value) => {
            new RoomVisual(roomName).text(value.toString(), x, y, { font: 0.3 })
        })

        return enemyDamage;
    }

    return createCache(createRoomEnemyDamage)
}

/**
 * 计算 tower 伤害
 * @author fangxm
 * 
 * @param dist 点到 tower 的距离
 */
const calTowerDamage = function (dist: number) {
    if (dist <= 5) return 600;
    else if (dist <= 20) return 600 - (dist - 5) * 30;
    else return 150;
}

/**
 * 计算在一个房间内一个点的tower伤害总值
 * 这里并没有添加 isActive 检查，因为比较耗性能
 * @author fangxm
 * 
 * @param {Room} room tower所在房间
 * @param {RoomPosition} pos 要计算伤害的点
 */
const getAllTowerDamage = function (towers: StructureTower[], pos: RoomPosition) {
    return _.sum(towers, tower => {
        if (tower.store.energy < 10) return 0;
        let ratio = 1;
        if (tower.effects && tower.effects.length) tower.effects.forEach(effect => {
            if (effect.effect == PWR_OPERATE_TOWER) ratio = POWER_INFO[effect.effect].effect[effect.level];
        });
        return calTowerDamage(tower.pos.getRangeTo(pos)) * ratio;
    });
}