/**
 * Lab 原型拓展
 * 
 * 会自动监听 terminal 中的化合物是否足够
 * 不足的话会自行合成
 * 在房间启用战争状态时会完成本轮化合物合成后切入战争状态
 * 在战争状态结束后后自动清理 lab 中残留的强化材料并重新恢复化合物合成
 */
export default class LabExtension extends StructureLab {
    public onWork(): void {
        this.room.myLab.runBoostController()
        this.room.myLab.runReactionController()
    }
}