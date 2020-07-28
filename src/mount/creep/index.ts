import { assignPrototype } from "utils"
import CreepExtension from "./extension"

/**
 * 挂载 creep 拓展
 */
export default () => {
    // 保存原始 move，在 creepExtension 里会进行修改
    if (!Creep.prototype._move) Creep.prototype._move = Creep.prototype.move
    assignPrototype(Creep, CreepExtension)
}