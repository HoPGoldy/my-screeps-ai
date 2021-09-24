import { WorkTaskType } from "@/modulesRoom"
import { CreepRole } from "@/role/types/role"

/**
 * 当墙壁建造好后将找到最近的工人刷一下自己
 * 
 * @param wallId 要修建的墙的 id
 * @param pos 墙所在的位置
 * @param room 墙所在的房间
 */
const onWallBuildComplete = function (wallId: Id<StructureWall | StructureRampart>, pos: RoomPosition, room: Room) {
    const filler = pos.findInRange(FIND_MY_CREEPS, 5).find(creep => {
        return creep.memory.role === CreepRole.Worker && !creep.memory.fillWallId
    })

    if (filler) filler.memory.fillWallId = wallId
    // 同时发布刷墙任务
    room.work.updateTask({ type: WorkTaskType.FillWall })
    // 移除墙壁缓存，让刷墙单位可以快速发现新 rempart
    delete room.memory.focusWall
} 

export class WallExtension extends StructureWall {
    public onBuildComplete(): void {
        onWallBuildComplete(this.id, this.pos, this.room)
    }
}

export class RampartExtension extends StructureRampart {
    public onBuildComplete(): void {
        onWallBuildComplete(this.id, this.pos, this.room)
    }
}