import RoomConsole from './room'

export default function () {
    // 拓展到原型的对应关系
    const assignMap = [
        [ Room, RoomConsole ]
    ]

    // 挂载所有拓展
    assignMap.forEach(protos => _.assign(protos[0].prototype, protos[1].prototype))
}