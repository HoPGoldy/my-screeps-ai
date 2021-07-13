const mockRemoveCreep = jest.fn()
const mockAddTask = jest.fn()

jest.mock('@/modulesGlobal/creep', () => ({
    removeCreep: mockRemoveCreep
}))
jest.mock('@/setting', () => ({
    DEFAULT_FLAG_NAME: {
        // 进攻
        ATTACK: 'attack',
        // 占领
        CLAIM: 'claim',
        // 待命
        STANDBY: 'standBy',
        // 掠夺
        REIVER: 'reiver'
    }
}))
jest.mock('@/utils', () => ({ log: () => {} }))

import { getMockRoom } from '@test/mock'
import { getMockSource } from '@test/mock/Source'
import RoomSpawnController from './controller'
import RoomCreepRelease from './creepRelease'
import { GetName } from './nameGetter'

let room: Room
let release: RoomCreepRelease

beforeEach(() => {
    room = getMockRoom({
        name: 'W1N1',
        source: [
            getMockSource({ id: '1' as Id<Source> }),
            getMockSource({ id: '2' as Id<Source> })
        ]
    })
    Game.rooms.W1N1 = room
    release = new RoomCreepRelease({ addTask: mockAddTask, room } as unknown as RoomSpawnController)
    // mock spawnController 的添加任务方法
    mockAddTask.mockReset()
    mockRemoveCreep.mockReset()
})

it('harvester 发布测试', () => {
    release.harvester()
    // 有两个 source，所以应该发布两个孵化任务
    expect(mockAddTask).toBeCalledTimes(2)
    // 两个孵化任务的 data 里应该正确包含 soure 的 id
    expect(mockAddTask.mock.calls.map(([ spawnTask ]) => spawnTask.data.sourceId)).toEqual(['1', '2'])
})

it('changeBaseUnit 可以正常增减，并保证最小单位数量', () => {
    // 从零开始新增工人
    release.changeBaseUnit('worker', 4)
    // 会新增四个工人
    expect(mockAddTask.mock.calls.map(([ spawnTask ]) => spawnTask.name)).toEqual([
        GetName.worker('W1N1', 0),
        GetName.worker('W1N1', 1),
        GetName.worker('W1N1', 2),
        GetName.worker('W1N1', 3)
    ])
    // 并且不会移除工人
    expect(mockRemoveCreep).not.toHaveBeenCalled()

    mockAddTask.mockReset()
    mockRemoveCreep.mockReset()

    // 减少一个 worker
    release.changeBaseUnit('worker', -1)
    expect(mockAddTask).not.toHaveBeenCalled()
    // 从末尾减少了一个 worker
    expect(mockRemoveCreep.mock.calls.map(([ creepName ]) => creepName)).toEqual([
        GetName.worker('W1N1', 3)
    ])

    mockAddTask.mockReset()
    mockRemoveCreep.mockReset()

    // 减少三个，由于这次修正超限了（每个房间最低 1 个单位），所以会只移除最后两个 worker
    release.changeBaseUnit('worker', -3)
    expect(mockAddTask).not.toHaveBeenCalled()
    expect(mockRemoveCreep.mock.calls.map(([ creepName ]) => creepName)).toEqual([
        GetName.worker('W1N1', 2),
        GetName.worker('W1N1', 1)
    ])
})

it('setBaseUnitLimit 重设数量上下限后，可以自动矫正数量', () => {
    // 新增10个工人
    release.changeBaseUnit('worker', 10)
    mockAddTask.mockReset()
    release.setBaseUnitLimit('worker', { MAX: 5 })

    // 不会新增，并且还会减少 5 个 worker，因为上限被设置成了 5
    release.changeBaseUnit('worker', 10)

    expect(mockAddTask.mock.calls.length).toEqual(0)
    expect(mockRemoveCreep.mock.calls.length).toEqual(5)

    // 新增 5 个搬运工
    release.changeBaseUnit('manager', 5)
    mockAddTask.mockReset()
    mockRemoveCreep.mockReset()
    // 把下限设置为 10
    release.setBaseUnitLimit('manager', { MIN: 10 })

    // 不会减少，并且还会新增 5 个搬运工
    release.changeBaseUnit('manager', -5)

    // 不会
    expect(mockRemoveCreep.mock.calls.length).toEqual(0)
    expect(mockAddTask.mock.calls.length).toEqual(5)
})
