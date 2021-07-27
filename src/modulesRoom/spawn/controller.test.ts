import { getMockRoom, getMockSpawn } from '@test/mock'
import { getMockSpawning } from '@test/mock/structures/Spawning'
import RoomTransportTaskController from '@/modulesRoom/taskTransport/controller'
import { creepDefaultMemory } from './constant'
import RoomSpawnController from './controller'
import { SpawnTask } from './types'
import { CreepRole } from '@/role/types/role'

jest.mock('@/role', () => {
    return {
        default: {
            harvester: {
                bodys: () => [ WORK, CARRY, MOVE ]
            },
            signer: {
                bodys: () => [ WORK, CARRY, MOVE ]
            },
            reiver: {
                bodys: () => [ WORK, CARRY, MOVE ]
            },
        }
    }
})

jest.mock('./creepRelease', () => ({
    default: class RoomCreepRelease {
        constructor() {}
    }
}))

/**
 * 伪造一个孵化任务
 */
const getSpawnTask = (
    name: string = 'creepA',
    role: CreepRole = CreepRole.Harvester,
    data: AnyObject = { flag: 'mock' }
): SpawnTask => ({ name, data, role })

it('可以正常增减任务', () => {
    const room = getMockRoom({ name: 'W1N1' })
    Game.rooms.W1N1 = room
    const controller = new RoomSpawnController('W1N1')

    const spawnTaskA = getSpawnTask()

    controller.addTask(spawnTaskA)
    // 在内存中可以读到保存的任务
    expect(room.memory).toHaveProperty('spawnList', [spawnTaskA])

    controller.removeCurrentTask()
    // 任务正常被移除
    expect(room.memory).not.toHaveProperty('spawnList')

    controller.addTask(spawnTaskA)
    const result = controller.addTask(spawnTaskA)
    // 重名的任务不会被添加
    expect(result).toEqual(ERR_NAME_EXISTS)
    expect(room.memory).toHaveProperty('spawnList', [spawnTaskA])
})

it('可以挂起任务', () => {
    const room = getMockRoom({ name: 'W1N1' })
    Game.rooms.W1N1 = room
    const controller = new RoomSpawnController('W1N1')

    const spawnTaskA = getSpawnTask()
    const spawnTaskB = getSpawnTask('creepB')

    controller.addTask(spawnTaskA)
    controller.addTask(spawnTaskB)
    // 在内存中可以读到保存的任务
    expect(room.memory).toHaveProperty('spawnList', [spawnTaskA, spawnTaskB])

    controller.hangTask()
    // 任务被挂起到末尾
    expect(room.memory).toHaveProperty('spawnList', [spawnTaskB, spawnTaskA])
})

it('spawnCreep 测试', () => {
    const room = getMockRoom({ name: 'W1N1' })
    Game.rooms.W1N1 = room

    const spawnTaskA = getSpawnTask()

    const spawnCreep = jest.fn().mockReturnValue(OK)
    const spawn = getMockSpawn({ spawnCreep })

    const controller = new RoomSpawnController('W1N1')
    controller.addTask(spawnTaskA)
    controller.runSpawn(spawn)

    // 讲会正常访问 spawn.spawnCreep 进行孵化
    expect(spawnCreep).toBeCalled()
    const { role, data } = spawnTaskA
    const creepMemory = {
        ...creepDefaultMemory,
        spawnRoom: 'W1N1',
        role, data
    }
    // creep 的身体部件、名称及内存中的角色和数据都应正确设置
    expect(spawnCreep).toBeCalledWith([ WORK, CARRY, MOVE ], 'creepA', { memory: creepMemory })
})

it('孵化后应正确添加能量填充任务', () => {
    const updateTransportTask = jest.fn()

    const room = getMockRoom({
        name: 'W1N1',
        // mock 一个物流模块
        transport: { updateTask: updateTransportTask } as unknown as RoomTransportTaskController,
        power: { addTask: jest.fn() } as any
    })
    Game.rooms.W1N1 = room
    // 创建一个刚开始孵化的 spawn
    const spawn = getMockSpawn({
        spawning: getMockSpawning({ needTime: 10, remainingTime: 9 })
    })

    const controller = new RoomSpawnController('W1N1')
    controller.runSpawn(spawn)
    // 发现开始孵化，应该发布 ext 填充任务
    expect(updateTransportTask.mock.calls[0][0]).toHaveProperty('type', 'fillExtension')

    // 下个 tick
    spawn.spawning = getMockSpawning({ needTime: 10, remainingTime: 8 })
    // 每次孵化期间只会发布一次填充任务
    expect(updateTransportTask).toHaveBeenCalledTimes(1)
})

it('能量不足时会挂起非重要孵化任务', () => {
    const room = getMockRoom({ name: 'W1N1' })
    Game.rooms.W1N1 = room

    const spawnTaskA = getSpawnTask()
    const spawnTaskB = getSpawnTask('creepB', CreepRole.Signer)
    const spawnTaskC = getSpawnTask('creepC', CreepRole.Reiver)

    const spawnCreep = jest.fn().mockReturnValue(ERR_NOT_ENOUGH_ENERGY)
    const spawn = getMockSpawn({ spawnCreep })

    const controller = new RoomSpawnController('W1N1')
    // 添加两个普通孵化任务和一个重要孵化任务
    controller.addTask(spawnTaskB)
    controller.addTask(spawnTaskC)
    controller.addTask(spawnTaskA)

    controller.runSpawn(spawn)
    // 由于返回能量不足，所以 creepB 被挂起
    expect(room.memory.spawnList[0]).toEqual(spawnTaskC)

    controller.runSpawn(spawn)
    // 由于返回能量不足，所以 creepC 被挂起
    expect(room.memory.spawnList[0]).toEqual(spawnTaskA)

    controller.runSpawn(spawn)
    // 但是由于 creepA 是重要角色，所以它不会被挂起
    expect(room.memory.spawnList[0]).toEqual(spawnTaskA)

    controller.runSpawn(spawn)
    // 再执行一次也一样
    expect(room.memory.spawnList[0]).toEqual(spawnTaskA)

    spawnCreep.mockReturnValueOnce(OK)
    controller.runSpawn(spawn)
    // 返回 OK，creepA 应该被正确移除（孵化了）
    expect(room.memory.spawnList).toEqual([spawnTaskB, spawnTaskC])

    controller.runSpawn(spawn)
    // 再次能量不足，creepB 被挂起到末尾
    expect(room.memory.spawnList).toEqual([spawnTaskC, spawnTaskB])
})