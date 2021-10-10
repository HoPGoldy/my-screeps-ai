/**
 * 房间位置拓展
 */
export default class PositionExtension extends RoomPosition {
    /**
     * 获取当前位置目标方向的 pos 对象
     * 
     * @param direction 目标方向
     */
    public directionToPos(direction: DirectionConstant): RoomPosition | undefined {
        let targetX = this.x
        let targetY = this.y

        // 纵轴移动，方向朝下就 y ++，否则就 y --
        if (direction !== LEFT && direction !== RIGHT) {
            if (direction > LEFT || direction < RIGHT) targetY --
            else targetY ++
        }
        // 横轴移动，方向朝右就 x ++，否则就 x --
        if (direction !== TOP && direction !== BOTTOM) {
            if (direction < BOTTOM) targetX ++
            else targetX --
        }

        // 如果要移动到另一个房间的话就返回空，否则返回目标 pos
        if (targetX < 0 || targetY > 49 || targetX > 49 || targetY < 0) return undefined
        else return new RoomPosition(targetX, targetY, this.roomName)
    }

    /**
     * 获取该位置周围的开采位空位
     * 也会搜索建筑、工地和 creep
     */
    public getFreeSpace(): RoomPosition[] {
        if (this._freeSpace) return this._freeSpace

        const terrain = new Room.Terrain(this.roomName)
        const result: RoomPosition[] = []

        const xs = [this.x - 1, this.x, this.x + 1]
        const ys = [this.y - 1, this.y, this.y + 1]

        // 遍历 x 和 y 坐标
        xs.forEach(x => ys.forEach(y => {
            // 如果不是墙则 ++
            if (terrain.get(x, y) != TERRAIN_MASK_WALL) result.push(new RoomPosition(x, y, this.roomName))
        }))

        // 附近会占据位置的游戏对象
        const nearGameObject = [
            ...this.findInRange(FIND_STRUCTURES, 1),
            ...this.findInRange(FIND_CONSTRUCTION_SITES, 1),
            // 暂时不包含 creep，因为如果自己在附近的话会把自己的位置筛掉，这就导致无论如何自己所在的位置都不是空余开采位
            // ...this.findInRange(FIND_CREEPS, 1),
            // ...this.findInRange(FIND_POWER_CREEPS, 1)
        ].filter(({ structureType }) => (
            structureType !== STRUCTURE_CONTAINER &&
            structureType !== STRUCTURE_RAMPART &&
            structureType !== STRUCTURE_ROAD
        ))

        // 筛掉会占据位置的对象
        return this._freeSpace = result.filter(pos => nearGameObject.every(obj => !obj.pos.isEqualTo(pos)))
    }
}

declare global {
    interface RoomPosition {
        /** 本 tick 的周围空余开采位缓存 */
        _freeSpace: RoomPosition[]

        directionToPos(direction: DirectionConstant): RoomPosition | undefined
        getFreeSpace(): RoomPosition[]
    }
}