import { createRoomLink, log } from '@/utils'

/**
 * 房间访问器
 * 
 * 提供了一套用于和所在房间进行交互的接口
 * 如获取所在房间，获取模块内存，保存模块内存
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
    }

    /**
     * 模块内存
     */
    protected get memory(): MemoryType {
        const { memory } = this.room

        if (!memory[this.memoryKey]) memory[this.memoryKey] = this.defaultMemory
        return memory[this.memoryKey]
    }

    /**
     * 模块所在房间
     */
    public get room(): Room {
        if (!Game.rooms[this.roomName]) {
            log(`无法访问房间实例，模块已停止运行`, [this.roomName, this.moduleName], 'red', true)
            throw new Error(`${this.roomName} ${this.moduleName} 房间实例不存在`)
        }
        return Game.rooms[this.roomName]
    }

    /**
     * 设置模块内存
     */
    protected set memory(newMemory: MemoryType) {
        if (!newMemory) delete this.room.memory[this.memoryKey]
        else this.room.memory[this.memoryKey] = newMemory
    }

    /**
     * 显示日志
     * 
     * @param content 日志内容
     * @param color 日志前缀颜色
     * @param notify 是否发送邮件
     */
    protected log(content: string, color: Colors | undefined = undefined, notify: boolean = false): void {
        // 为房间名添加超链接
        const roomName = createRoomLink(this.roomName)
        log(content, [ roomName, this.moduleName ], color, notify)
    }
}