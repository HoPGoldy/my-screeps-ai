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
    protected roomName: string
    /**
     * 该模块的名称，用于日志输出
     */
    protected moduleName: string
    /**
     * 该模块的数据储存于 room.memory 的哪个键上
     */
    protected memoryKey: string
    /**
     * 当 room.memory 没有模块数据时使用的默认内存
     */
    protected defaultMemory: MemoryType
    /**
     * 当前的模块数据
     */
    private _memory: MemoryType

    /**
     * 初始化房间访问
     * 
     * @param moduleName 本模块的名称
     * @param roomName 要管理的房间名
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
        if (this._memory) return this._memory

        try {
            // 房间内存不存在，使用默认内存
            if (!Game.rooms[this.roomName].memory[this.memoryKey]) this._memory = this.defaultMemory
            // 存在，使用 memory 中的数据
            else this._memory = JSON.parse(Game.rooms[this.roomName].memory[this.memoryKey])
    
            return this._memory
        }
        catch (e) {
            log(`无法访问房间实例，模块已停止运行`, [this.moduleName], 'red', true)
            throw e
        }
    }

    /**
     * 模块所在房间
     */
    protected get room(): Room {
        if (!Game.rooms[this.roomName]) {
            log(`无法访问房间实例，模块已停止运行`, [this.moduleName], 'red', true)
            throw new Error(`${this.roomName} ${this.moduleName} 房间实例不存在`)
        }
        return Game.rooms[this.roomName]
    }

    /**
     * 设置模块内存
     */
    protected set memory(newMemory: MemoryType) {
        this._memory = newMemory
    }

    /**
     * 把当前数据保存至 room.memory
     */
    protected saveMemory(): void {
        try {
            // 如果内存为空的话，就清空存储
            if (_.isEmpty(this._memory)) delete Game.rooms[this.roomName].memory[this.memoryKey]
            // 否则将内存格式化成字符串进行保存
            else {
                const data = JSON.stringify(this._memory)
                Game.rooms[this.roomName].memory[this.memoryKey] = data
            }
        }
        catch (e) {
            log(`无法访问房间实例，模块已停止运行`, [this.moduleName], 'red', true)
            throw e
        }
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