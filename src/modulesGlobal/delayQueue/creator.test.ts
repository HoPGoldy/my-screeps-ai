import { createDelayQueue } from './index'
import { getTestEnvContext } from '@test/mock'

describe('延迟任务队列测试', () => {
    it('本 tick 的新任务会被立刻执行', () => {
        const { env } = getTestEnvContext()
        const { manageDelayTask, withDelayCallback } = createDelayQueue({
            getMemory: () => ({}), env
        })
        const mockCallback = jest.fn()

        // 添加任务并加载回调
        const delayCallbackData = { roomName: 'W1N1' }
        const addDelayTask = withDelayCallback('type', mockCallback)
        addDelayTask(delayCallbackData, 0)

        // 执行模块
        manageDelayTask()

        // 注册的回调应该被调用一次
        expect(mockCallback).toBeCalled()

        // 回调传入的参数应该是发布任务时传入的 data
        const callbackArgs = mockCallback.mock.calls[0]
        expect(callbackArgs[0]).toEqual(delayCallbackData)
    })

    it('任务可以延迟触发', () => {
        const { mockGame, env } = getTestEnvContext()
        const memory = {}
        const { manageDelayTask, withDelayCallback } = createDelayQueue({
            getMemory: () => memory, env
        })

        // 添加任务并加载回调
        const mockCallback1 = jest.fn()
        const addDelayTask1 = withDelayCallback('type1', mockCallback1)
        addDelayTask1({ roomName: 'W1N1' }, 1)
        addDelayTask1({ roomName: 'W2N2' }, 3)

        const mockCallback2 = jest.fn()
        const addDelayTask2 = withDelayCallback('type2', mockCallback2)
        addDelayTask2({ sourceId: '123' }, 2)

        // 执行模块
        manageDelayTask()
        expect(mockCallback1).not.toBeCalled()
        expect(mockCallback2).not.toBeCalled()

        mockGame.time += 1
        manageDelayTask()
        // 注册的回调应该被调用一次
        expect(mockCallback1).toBeCalled()
        let callbackArgs = mockCallback1.mock.calls[0]
        expect(callbackArgs[0]).toEqual({ roomName: 'W1N1' })

        mockGame.time += 1
        manageDelayTask()
        // 第二个回调应该被调用一次
        expect(mockCallback2).toBeCalled()
        // 且不会触发第一个回调
        expect(mockCallback1).toBeCalledTimes(1)
        callbackArgs = mockCallback2.mock.calls[0]
        expect(callbackArgs[0]).toEqual({ sourceId: '123' })

        mockGame.time += 1
        manageDelayTask()
        // 注册的回调应该被调用两次
        expect(mockCallback1).toBeCalledTimes(2)
        callbackArgs = mockCallback1.mock.calls[1]
        expect(callbackArgs[0]).toEqual({ roomName: 'W2N2' })
    })
})
