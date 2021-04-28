import baseTaskController from './baseTaskController'
import { getMockCreep, mockGetObjectById } from '@test/mock'

describe('房间任务核心测试', () => {
    // 获取指定优先级的任务
    const getTask = (priority: number): RoomTask<string> => ({ type: `${priority}`, priority })
    // 获取指定优先级的特殊任务
    const getSpecialTask = (priority: number, specialType: string): RoomTask<string> => ({
        type: `${priority}`,
        priority,
        require: specialType
    })
    // 获取指定类型的特殊工人
    const getSpecialCreep = (specialType: string): Creep => {
        return getMockCreep({ memory: { bodyType: specialType as SepicalBodyType } as CreepMemory})
    }

    it('可以从 Memory 中初始化任务', () => {
        const taskKey = 123
        const roomName = 'W1N1'

        // 构建测试场景：一个工人，一个保存到房间内存中的任务，任务和工人已关联
        const creep = getMockCreep()
        const task: RoomTask<'test'> = {
            type: 'test', priority: 10, key: taskKey, need: 1, unit: 0
        }
        const roomMemory = {
            transportTasks: JSON.stringify([task]),
            transportCreeps: JSON.stringify({ [creep.name]: { doing: taskKey }})
        } as RoomMemory
        Memory.rooms = { [roomName]: roomMemory }

        // 从控制器获取该工人的任务
        const controller = new baseTaskController(roomName, 'transport')
        const doingTask = controller.getUnitTask(creep)

        // 可以获取到已关联的目标任务
        expect(doingTask).toEqual(task)
    })

    it('可以给任务分配工人', () => {
        const roomName = 'W1N1'

        // 构建测试场景：一个新工人和一个新任务
        const creep = getMockCreep({ name: 'testCreepName' })
        const task: RoomTask<'test'> = { type: 'test' }
        Memory.rooms = { [roomName]: {} as RoomMemory }

        const controller = new baseTaskController(roomName, 'transport')
        // 先添加任务，并让新工人去获取任务
        controller.addTask(task)
        const doingTask = controller.getUnitTask(creep)

        // 工人应该获取到新任务
        expect(doingTask).toBeDefined()
        expect(doingTask.type).toEqual('test')
    })

    it('按照优先级分配工人' /** 且不受任务添加顺序影响 */, () => {
        const roomName = 'W1N1'
        Memory.rooms = { [roomName]: {} as RoomMemory }

        const controller = new baseTaskController(roomName, 'transport')
        // 乱序添加任务
        controller.addTask(getTask(5))
        controller.addTask(getTask(10))
        controller.addTask(getTask(3))

        // 新工人应按照优先级获取任务
        let doingTask = controller.getUnitTask(getMockCreep())
        expect(doingTask.type).toEqual('10')
        doingTask = controller.getUnitTask(getMockCreep())
        expect(doingTask.type).toEqual('5')
        doingTask = controller.getUnitTask(getMockCreep())
        expect(doingTask.type).toEqual('3')

        controller.addTask(getTask(undefined))
        controller.addTask(getTask(11))
        
        doingTask = controller.getUnitTask(getMockCreep())
        expect(doingTask.type).toEqual('11')
        doingTask = controller.getUnitTask(getMockCreep())
        expect(doingTask.type).toEqual('undefined')
    })

    it('溢出后将被分配到优先级最高的任务', () => {
        const roomName = 'W1N1'
        Memory.rooms = { [roomName]: {} as RoomMemory }

        const controller = new baseTaskController(roomName, 'transport')
        // 乱序添加任务
        controller.addTask(getTask(5))
        controller.addTask(getTask(10))
        controller.addTask(getTask(3))

        // 让每个任务都有人做
        controller.getUnitTask(getMockCreep())
        controller.getUnitTask(getMockCreep())
        controller.getUnitTask(getMockCreep())

        // 这两个 creep 将会溢出
        controller.getUnitTask(getMockCreep())
        const doingTask = controller.getUnitTask(getMockCreep())
        // 这两个 creep 会被分配到优先级最高的任务上，此时优先级最高的任务一共有三个人做
        expect(doingTask).toMatchObject({ type: '10', need: 1, unit: 3 })
    })

    it('特殊体型的工人只会被分配到对应的任务上' /** 且不同类型的特殊任务互不干扰 */, () => {
        const roomName = 'W1N1'
        const specialTypeA = 'specialA'
        const specialTypeB = 'specialB'
        Memory.rooms = { [roomName]: {} as RoomMemory }

        // 一个高优先级的普通任务和两个低优先级的特殊任务
        const normalTask = getTask(10)
        const specialTaskA = getSpecialTask(5, specialTypeA)
        const specialTaskB = getSpecialTask(6, specialTypeB)

        const controller = new baseTaskController(roomName, 'transport')
        controller.addTask(normalTask)
        controller.addTask(specialTaskA)
        controller.addTask(specialTaskB)

        // 特殊工人去领任务，每个人都应该领到对应类型的任务
        const doingTaskA = controller.getUnitTask(getSpecialCreep(specialTypeA))
        expect(doingTaskA).toMatchObject({ type: '5', need: 1, unit: 1, require: specialTypeA, requireUnit: 1 })
        const doingTaskB = controller.getUnitTask(getSpecialCreep(specialTypeB))
        expect(doingTaskB).toMatchObject({ type: '6', need: 1, unit: 1, require: specialTypeB, requireUnit: 1 })

        // 这个特殊工人没有对应的特殊任务，所以它什么都获取不到
        const doingTaskC = controller.getUnitTask(getSpecialCreep('noneType'))
        expect(doingTaskC).toBeUndefined()
    })

    it('普通工人可以干特殊任务', () => {
        const roomName = 'W1N1'
        const specialTypeA = 'typeA'
        const specialTypeB = 'typeB'
        Memory.rooms = { [roomName]: {} as RoomMemory }

        const controller = new baseTaskController(roomName, 'transport')
        // 添加两个特殊任务
        controller.addTask(getSpecialTask(5, specialTypeA))
        controller.addTask(getSpecialTask(10, specialTypeB))

        // 普通工人去领特殊任务，将无视任务类型，仅按照优先级领任务
        const doingTaskA = controller.getUnitTask(getMockCreep())
        expect(doingTaskA).toMatchObject({ type: '10', need: 1, unit: 1, require: specialTypeB })
        const doingTaskB = controller.getUnitTask(getMockCreep())
        expect(doingTaskB).toMatchObject({ type: '5', need: 1, unit: 1, require: specialTypeA })
    })

    it('特殊工人可以挤占普通工人的工作' /** 如果没有优先级更高的同类型特殊任务的话 */, () => {
        const roomName = 'W1N1'
        const specialType = 'special'
        const normalCreep = getMockCreep()
        Memory.rooms = { [roomName]: {} as RoomMemory }
        // 因为模块内部会访问 Game.creeps 来获取工人，所以这里需要伪造下
        Game.creeps[normalCreep.name] = normalCreep;

        const controller = new baseTaskController(roomName, 'transport')
        // 添加一个特殊任务
        controller.addTask(getSpecialTask(5, specialType))
        // 让普通工人先干着
        controller.getUnitTask(normalCreep)
        // 特殊工人找工作，由于比普通工人更符合，所以会挤占普通工人的任务
        const doingTask = controller.getUnitTask(getSpecialCreep(specialType))
        expect(doingTask).toMatchObject({ type: '5', need: 1, unit: 1, require: specialType, requireUnit: 1 })

        // 添加一个低优先级任务
        controller.addTask(getTask(3))
        // 由于特殊工人挤占了普通工人的工作，并且特殊任务需要的人已经满了，所以丢掉工作的普通工人会领到这个任务
        const newTask = controller.getUnitTask(normalCreep)
        expect(newTask).toMatchObject({ type: '3' })
    })

    it('可以分配指定数量的单位到任务', () => {
        const roomName = 'W1N1'
        const taskANeed = 2
        const taskBNeed = 4
        Memory.rooms = { [roomName]: {} as RoomMemory }

        const specialTaskA = getSpecialTask(10, 'typeA')
        specialTaskA.need = taskANeed
        const normalTaskA = getTask(6)
        normalTaskA.need = taskBNeed
        const normalTaskB = getTask(3)

        const controller = new baseTaskController(roomName, 'transport')
        // 添加任务
        controller.addTask(specialTaskA)
        controller.addTask(normalTaskA)
        controller.addTask(normalTaskB)

        // 添加特殊任务 A 对应数量的特殊工人
        for (let i = 0; i < taskANeed; i++) {
            const task = controller.getUnitTask(getSpecialCreep(specialTaskA.require))
            expect(task).toMatchObject({ type: specialTaskA.type, requireUnit: i + 1, unit: i + 1 })
        }

        // 添加普通任务 A 对应数量的普通工人
        for (let i = 0; i < taskBNeed; i++) {
            const task = controller.getUnitTask(getMockCreep())
            expect(task).toMatchObject({ type: '6', unit: i + 1 })
        }

        // 再添加一个普通工人，由于任务 A 人够了，所以这个工人会被分配到任务 B 上
        let task = controller.getUnitTask(getMockCreep())
        expect(task).toMatchObject({ type: '3', unit: 1 })

        // 再添加一个普通工人，由于所有任务人都够了，所以他会被溢出到优先级最高的特殊任务 A 上
        task = controller.getUnitTask(getMockCreep())
        expect(task).toMatchObject({ type: specialTaskA.type, unit: taskANeed + 1, requireUnit: taskANeed })
    })

    it('任务完成后对应的工人会分配到新任务', () => {
        const roomName = 'W1N1'
        Memory.rooms = { [roomName]: {} as RoomMemory }

        const controller = new baseTaskController(roomName, 'transport')
        const creep = getMockCreep()
        mockGetObjectById([creep])
        // 添加任务，并分配一个工人
        controller.addTask(getTask(6))
        controller.addTask(getTask(3))
        controller.getUnitTask(creep)

        // 结束 creep 正在执行的任务并重新获取任务
        controller.removeTask('6')
        const newTask = controller.getUnitTask(creep)

        // creep 应该被分配到新的任务上
        expect(newTask).toMatchObject({ type: '3' })
    })
})
