/**
* 把房间挂载到全局
* 来方便控制台操作，在访问时会实时的获取房间对象
* 注意：仅会挂载 Memory.rooms 里有的房间
*/
export default Object.keys(Memory.rooms || {}).reduce((getters, roomName) => {
    getters[roomName] = (() => Game.rooms[roomName])
    return getters
}, {})