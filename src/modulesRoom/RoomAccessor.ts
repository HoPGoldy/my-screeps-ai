import { Color, createLog, createRoomLink, log } from "@/modulesGlobal/console/utils"

/**
 * 房间访问器
 * 
 * 提供了一套用于和所在房间进行交互的接口
 * 如获取所在房间，获取模块内存
 */
export default class RoomAccessor<MemoryType> {
    /**
     * 该模块所在的房间名
     */
    public roomName: string
    /**
     * 该模块的名称，用于日志输出
     */
    public moduleName: string
    /**
     * 该模块的数据储存于 room.memory 的哪个键上
     */
    protected memoryKey: string
    /**
     * 当 room.memory 没有模块数据时使用的默认内存
     */
    protected defaultMemory: MemoryType

    protected log: ReturnType<typeof createLog>

    /**
     * 初始化房间访问
     * 
     * @param moduleName 本模块的名称
     * @param roomName 所在的房间名
     * @param memoryKey 模块数据要保存到房间哪个键上
     * @param defaultMemory 缺省的模块内存
     */
    constructor(moduleName: string, roomName: string, memoryKey: string, defaultMemory: MemoryType) {
        this.roomName = roomName
        this.moduleName = moduleName
        this.memoryKey = memoryKey
        this.defaultMemory = defaultMemory
        this.log = createLog(createRoomLink(this.roomName) + ' ' + this.moduleName)
    }

    /**
     * 模块内存
     */
    protected get memory(): MemoryType {
        const { memory } = this.room
        // 未定义的话就用默认内存
        if (!memory[this.memoryKey]) {
            memory[this.memoryKey] = _.cloneDeep(this.defaultMemory)
        }

        return memory[this.memoryKey]
    }

    /**
     * 模块所在房间
     */
    public get room(): Room {
        if (!Game.rooms[this.roomName]) {
            this.log.error(`无法访问房间实例，模块已停止运行`)
            throw new Error(`${this.roomName} ${this.moduleName} 房间实例不存在`)
        }
        return Game.rooms[this.roomName]
    }

    /**
     * 设置模块内存
     */
    protected set memory(newMemory: MemoryType) {
        const { memory } = this.room

        if (!newMemory) delete memory[this.memoryKey]
        else memory[this.memoryKey] = newMemory
    }
}