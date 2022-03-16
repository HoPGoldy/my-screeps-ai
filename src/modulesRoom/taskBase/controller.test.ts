// import { createTaskController } from './controller'
// import { getMockCreep, getMockRoom, mockGetObjectById } from '@test/mock'
// import { RoomTask } from './types'
// import { createEnvContext } from '@/utils'

// describe('房间任务核心测试', () => {
//     // 获取指定优先级的任务
//     const getTask = (priority: number): RoomTask<string> => ({ type: `${priority}`, priority, need: 1 })

//     it('可以从 Memory 中初始化任务', () => {
//         const taskKey = 123
//         const roomName = 'W1N1'

//         // 构建测试场景：一个工人，一个保存到房间内存中的任务，任务和工人已关联
//         const creep = getMockCreep()
//         const task: RoomTask<'test'> = {
//             type: 'test', priority: 10, key: taskKey, need: 1, unit: 0
//         }

//         const testMemory = {}
//         const roomMemory = {
//             transport: {
//                 tasks: [task],
//                 creeps: { [creep.name]: { doing: taskKey } }
//             }
//         } as unknown as RoomMemory
//         Memory.rooms = { [roomName]: roomMemory }
//         Game.rooms[roomName] = getMockRoom({ name: roomName, memory: roomMemory })

//         // 从控制器获取该工人的任务
//         const controller = createTaskController({
//             getMemory: () => testMemory,
//             env: createEnvContext('test'),
//             releaseUnit: () => {}
//         })
//         const doingTask = controller.getUnitTask(creep)

//         // 可以获取到已关联的目标任务
//         expect(doingTask).toEqual(task)
//     })

//     it('可以给任务分配工人', () => {
//         const roomName = 'W1N1'

//         // 构建测试场景：一个新工人和一个新任务
//         const creep = getMockCreep({ name: 'testCreepName' })
//         const task: RoomTask<'test'> = { type: 'test' }
//         Memory.rooms = { [roomName]: {} as RoomMemory }
//         Game.rooms[roomName] = getMockRoom({ name: roomName })

//         const controller = new BaseTaskController(roomName, 'transport')
//         // 先添加任务，并让新工人去获取任务
//         controller.addTask(task)
//         const doingTask = controller.getUnitTask(creep)

//         // 工人应该获取到新任务
//         expect(doingTask).toBeDefined()
//         expect(doingTask.type).toEqual('test')
//     })

//     it('按照优先级分配工人' /** 且不受任务添加顺序影响 */, () => {
//         const roomName = 'W1N1'
//         Memory.rooms = { [roomName]: {} as RoomMemory }
//         Game.rooms[roomName] = getMockRoom({ name: roomName })

//         const controller = new BaseTaskController(roomName, 'transport')
//         // 乱序添加任务
//         controller.addTask(getTask(5))
//         controller.addTask(getTask(10))
//         controller.addTask(getTask(3))

//         // 新工人应按照优先级获取任务
//         let doingTask = controller.getUnitTask(getMockCreep())
//         expect(doingTask.type).toEqual('10')
//         doingTask = controller.getUnitTask(getMockCreep())
//         expect(doingTask.type).toEqual('5')
//         doingTask = controller.getUnitTask(getMockCreep())
//         expect(doingTask.type).toEqual('3')

//         controller.addTask(getTask(undefined))
//         controller.addTask(getTask(11))

//         doingTask = controller.getUnitTask(getMockCreep())
//         expect(doingTask.type).toEqual('11')
//         doingTask = controller.getUnitTask(getMockCreep())
//         expect(doingTask.type).toEqual('undefined')
//     })

//     it('溢出后将被分配到优先级最高的任务', () => {
//         const roomName = 'W1N1'
//         Memory.rooms = { [roomName]: {} as RoomMemory }
//         Game.rooms[roomName] = getMockRoom({ name: roomName })

//         const controller = new BaseTaskController(roomName, 'transport')
//         // 乱序添加任务
//         controller.addTask(getTask(5))
//         controller.addTask(getTask(10))
//         controller.addTask(getTask(3))

//         // 让每个任务都有人做
//         controller.getUnitTask(getMockCreep())
//         controller.getUnitTask(getMockCreep())
//         controller.getUnitTask(getMockCreep())

//         // 这两个 creep 将会溢出
//         controller.getUnitTask(getMockCreep())
//         const doingTask = controller.getUnitTask(getMockCreep())
//         // 这两个 creep 会被分配到优先级最高的任务上，此时优先级最高的任务一共有三个人做
//         expect(doingTask).toMatchObject({ type: '10', need: 1, unit: 3 })
//     })

//     it('任务完成后对应的工人会分配到新任务', () => {
//         const roomName = 'W1N1'
//         Memory.rooms = { [roomName]: {} as RoomMemory }
//         Game.rooms[roomName] = getMockRoom({ name: roomName })

//         const controller = new BaseTaskController(roomName, 'transport')
//         const creep = getMockCreep()
//         mockGetObjectById([creep])
//         // 添加任务，并分配一个工人
//         controller.addTask(getTask(6))
//         controller.addTask(getTask(3))
//         controller.getUnitTask(creep)

//         // 结束 creep 正在执行的任务并重新获取任务
//         controller.removeTaskByType('6')
//         const newTask = controller.getUnitTask(creep)

//         // creep 应该被分配到新的任务上
//         expect(newTask).toMatchObject({ type: '3' })
//     })
// })
