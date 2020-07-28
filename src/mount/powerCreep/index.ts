import { assignPrototype } from "utils"
import PowerCreepExtension from "./mount.powerCreep"

// 挂载拓展到 PowerCreep 原型
export default function () {
    // 直接访问 creep 原型的原始移动
    if (!PowerCreep.prototype._move) PowerCreep.prototype._move = Creep.prototype._move

    assignPrototype(PowerCreep, PowerCreepExtension)
}
