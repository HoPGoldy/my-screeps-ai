import { getMockRoom, getMockSpawn } from '@test/mock'
import { getMockSpawning } from '@test/mock/structures/Spawning'
import { RoomTransportTaskController } from '../task'
import { creepDefaultMemory } from './constant'
import RoomSpawnController from './index'

jest.mock('@/role', () => {
    return {
        default: {
            harvester: {
                bodys: () => [ WORK, CARRY, MOVE ]
            }
        }
    }
})

it('可以正常增减任务', () => {
    const room = getMockRoom({ name: 'W1N1' })
    Game.rooms.W1N1 = room
    const controller = new RoomSpawnController('W1N1')

    controller.addTask('creepA')
    // 在内存中可以读到保存的任务
    expect(room.memory).toHaveProperty('spawnList', JSON.stringify(['creepA']))

    controller.removeCurrentTask()
    // 任务正常被移除
    expect(room.memory).not.toHaveProperty('spawnList')

    const result = controller.addTask('creepA')
    // 重名的任务不会被添加
    expect(result).toEqual(ERR_NAME_EXISTS)
    expect(room.memory).toHaveProperty('spawnList', JSON.stringify(['creepA']))
})

it('可以挂起任务', () => {
    const room = getMockRoom({ name: 'W1N1' })
    Game.rooms.W1N1 = room
    const controller = new RoomSpawnController('W1N1')

    controller.addTask('creepA')
    controller.addTask('creepB')
    // 在内存中可以读到保存的任务
    expect(room.memory).toHaveProperty('spawnList', JSON.stringify(['creepA', 'creepB']))

    controller.hangTask()
    // 任务被挂起到末尾
    expect(room.memory).toHaveProperty('spawnList', JSON.stringify(['creepB', 'creepA']))
})

it('spawnCreep 测试', () => {
    const room = getMockRoom({ name: 'W1N1' })
    Game.rooms.W1N1 = room

    const spawnCreep = jest.fn()
    const spawn = getMockSpawn({ spawnCreep })

    const controller = new RoomSpawnController('W1N1')
    controller.addTask('creepA')
    controller.runSpawn(spawn)

    // creepConfigs 中没有 creepA，不会调用孵化
    expect(spawnCreep).not.toBeCalled()
    // 没有这个配置项，所以任务会被移除
    expect(room.memory).not.toHaveProperty('spawnList')

    Memory.creepConfigs = { 'creepA': { role: 'harvester', data: { flag: 'mock' }, spawnRoom: 'W1N1' } }
    controller.addTask('creepA')
    controller.runSpawn(spawn)

    // 现在将会正常访问 spawn.spawnCreep 进行孵化
    expect(spawnCreep).toBeCalled()
    const creepMemory = {
        ...creepDefaultMemory,
        role: 'harvester',
        data: { flag: 'mock' }
    }
    // creep 的身体部件、名称及内存中的角色和数据都应正确设置
    expect(spawnCreep).toBeCalledWith([ WORK, CARRY, MOVE ], 'creepA', { memory: creepMemory })
})

it('spawn 后应正确添加能量填充任务', () => {
    const addTransportTask = jest.fn()

    const room = getMockRoom({
        name: 'W1N1',
        // mock 一个物流模块
        transport: { addTask: addTransportTask } as unknown as RoomTransportTaskController
    })
    Game.rooms.W1N1 = room
    // 创建一个刚开始孵化的 spawn
    const spawn = getMockSpawn({
        spawning: getMockSpawning({ needTime: 10, remainingTime: 9 })
    })

    const controller = new RoomSpawnController('W1N1')
    controller.runSpawn(spawn)
})