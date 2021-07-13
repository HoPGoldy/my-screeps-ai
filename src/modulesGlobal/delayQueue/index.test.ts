import { CreateDelayQueue } from './index'
import { getMockRoom } from '@test/mock'
import { DelayTask, DelayTaskData, DelayTaskType } from './types'

describe('延迟任务队列测试', () => {
    // 一个新增矿工的延迟任务
    const mockData: DelayTaskData = { roomName: 'W1N1' }
    const mockTask: DelayTask<DelayTaskType.SpawnMiner> = {
        name: DelayTaskType.SpawnMiner,
        data: mockData
    }

    it('可以从 Memory 中初始化任务', () => {
        const { initDelayTasks, manageDelayTask, addDelayCallback } = CreateDelayQueue()
        const mockCallback = jest.fn()

        // 把数据装进Memory，并添加对应的 room
        Memory.delayTasks = JSON.stringify({ 1: [mockTask] })
        Game.rooms['W1N1'] = getMockRoom({ name: 'W1N1' })
        Game.time = 1

        // 初始化模块并加载回调
        initDelayTasks()
        addDelayCallback(DelayTaskType.SpawnMiner, mockCallback)

        // 执行模块
        manageDelayTask()

        // 注册的回调应该被调用一次
        expect(mockCallback).toBeCalled()
        
        // 回调传入的参数应该是对应的 room 和 data
        const callbackArgs = mockCallback.mock.calls[0]
        expect(callbackArgs[0]).not.toBeUndefined()
        expect(callbackArgs[1]).toEqual(mockData)
     })

    it('可以添加新任务', () => {
        const { manageDelayTask, addDelayCallback, addDelayTask } = CreateDelayQueue()
        const mockCallback = jest.fn()

        // 添加任务并加载回调
        addDelayTask(DelayTaskType.SpawnMiner, mockData, 0)
        addDelayCallback(DelayTaskType.SpawnMiner, mockCallback)

        // 执行模块
        manageDelayTask()

        // 注册的回调应该被调用一次
        expect(mockCallback).toBeCalled()

        // 回调传入的参数应该是 undefined（因为 Game.rooms 里没有对应的房间）和 data
        const callbackArgs = mockCallback.mock.calls[0]
        expect(callbackArgs[0]).toBeUndefined()
        expect(callbackArgs[1]).toEqual(mockData)
    })

    it('可以保存任务到 Memory', () => {
        const { saveDelayTasks, addDelayTask } = CreateDelayQueue()

        // 添加任务并保存
        addDelayTask(DelayTaskType.SpawnMiner, mockData, 1)
        saveDelayTasks()

        expect(Memory).toHaveProperty('delayTasks')
        expect(Memory.delayTasks).toEqual(JSON.stringify({ 2: [mockTask] }))
    })

    it('任务可以延迟触发', () => {
        const { manageDelayTask, addDelayCallback, addDelayTask } = CreateDelayQueue()
        const mockCallback = jest.fn()

        // 添加不在本 tick 的任务并加载回调
        addDelayTask(DelayTaskType.SpawnMiner, mockData, 1)
        addDelayCallback(DelayTaskType.SpawnMiner, mockCallback)

        // 执行模块
        Game.time = 1
        manageDelayTask()
        expect(mockCallback).not.toBeCalled()

        Game.time = 2
        manageDelayTask()
        expect(mockCallback).toBeCalled()

        Game.time = 3
        manageDelayTask()
        expect(mockCallback).toBeCalled()
    })
})
