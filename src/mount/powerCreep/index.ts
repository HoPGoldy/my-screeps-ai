import { assignPrototype } from "utils"
import PowerCreepExtension from "./mount.powerCreep"

// 挂载拓展到 PowerCreep 原型
export default function () {
    assignPrototype(PowerCreep, PowerCreepExtension)
}
