import RoomAccessor from '../RoomAccessor'
import { DefenseStrategy } from './defense'
import { OperationStrategy } from './operation'

/**
 * 房间策略模块
 * 提供了一套语义化 api 用于管理房间配置
 * 该模块不需要内存
 */
export default class RoomStrategyController extends RoomAccessor<undefined> {
    /**
     * 运维策略
     */
    operation: OperationStrategy

    /**
     * 防御策略
     */
    defense: DefenseStrategy

    /**
     * 实例化房间策略
     * @param roomName 要管理的房间名
     */
    constructor (roomName: string) {
        super('roomStrategy', roomName, 'roomStrategy', undefined)
        this.operation = new OperationStrategy(this)
        this.defense = new DefenseStrategy(this)
    }
}
