import 'mocha'
import { DelayQueue } from './index'
import { expect } from 'chai'
import { spy } from 'sinon'
import { refreshGlobalMock, RoomMock } from '@mock/index'

describe('delayQueue 测试', function () {
    beforeEach(refreshGlobalMock)

    // 一个新增矿工的延迟任务
    const mockData: DelayTaskData = { roomName: 'W1N1' }
    const mockTask: DelayTask<'spawnMiner'> = {
        name: 'spawnMiner',
        data: mockData
    }

    it('可以从 Memory 中初始化任务', function () {
        const { initDelayTasks, manageDelayTask, addDelayCallback } = DelayQueue()
        const mockCallback = spy()

        // 把数据装进Memory，并添加对应的 room
        Memory.delayTasks = JSON.stringify({ 1: [mockTask] })
        Game.rooms['W1N1'] = new RoomMock('W1N1') as Room
        Game.time = 1

        // 初始化模块并加载回调
        initDelayTasks()
        addDelayCallback('spawnMiner', mockCallback)

        // 执行模块
        manageDelayTask()

        // 注册的回调应该被调用一次
        expect(mockCallback.callCount).to.be.equal(1)
        
        // 回调传入的参数应该是对应的 room 和 data
        const callbackArgs = mockCallback.getCall(0).args
        expect(callbackArgs[0]).to.be.an.instanceOf(RoomMock)
        expect(callbackArgs[1]).to.be.deep.equal(mockData)
    })

    it('可以添加新任务', function () {
        const { manageDelayTask, addDelayCallback, addDelayTask } = DelayQueue()
        const mockCallback = spy()

        // 添加任务并加载回调
        addDelayTask('spawnMiner', mockData, 1)
        addDelayCallback('spawnMiner', mockCallback)

        // 执行模块
        manageDelayTask()

        // 注册的回调应该被调用一次
        expect(mockCallback.callCount).to.be.equal(1)

        // 回调传入的参数应该是 undefined（因为 Game.rooms 里没有对应的房间）和 data
        const callbackArgs = mockCallback.getCall(0).args
        expect(callbackArgs[0]).to.be.equal(undefined)
        expect(callbackArgs[1]).to.be.deep.equal(mockData)
    })

    it('可以保存任务到 Memory', function () {
        const { saveDelayTasks, addDelayTask } = DelayQueue()

        // 添加任务并保存
        addDelayTask('spawnMiner', mockData, 1)
        saveDelayTasks()

        expect(Memory).to.include.keys('delayTasks')
        expect(Memory.delayTasks).to.be.equal(JSON.stringify({ 1: [mockTask] }))
    })

    it('任务可以延迟触发', function () {
        const { manageDelayTask, addDelayCallback, addDelayTask } = DelayQueue()
        const mockCallback = spy()

        // 添加不在本 tick 的任务并加载回调
        addDelayTask('spawnMiner', mockData, 2)
        addDelayCallback('spawnMiner', mockCallback)

        // 执行模块
        Game.time = 1
        manageDelayTask()
        expect(mockCallback.callCount).to.be.equal(0)

        Game.time = 2
        manageDelayTask()
        expect(mockCallback.callCount).to.be.equal(1)

        Game.time = 3
        manageDelayTask()
        expect(mockCallback.callCount).to.be.equal(1)
    })
})
