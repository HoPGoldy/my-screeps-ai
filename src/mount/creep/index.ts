import { assignPrototype } from "utils"
import CreepExtension from "./extension"

/**
 * 挂载 creep 拓展
 */
export default () => {
    assignPrototype(Creep, CreepExtension)
}