import { resolve } from 'path'
import { getServer, setBaseRoom } from '@test/serverUtils'
import { build } from '@test/moduleUtils'

it('全局状态扫描可用', async () => {
    const server = await getServer()
    await setBaseRoom(server)

    const modules = await build(resolve(__dirname, './main.ts'))
    const bot = await server.world.addBot({ username: 'log 测试 a', room: 'W0N1', x: 25, y: 25, modules })

    for (let i = 0; i < 21; i++) {
        await server.tick()
    }

    const memroy: Memory = JSON.parse(await bot.memory)
    // 将在第二十秒运行扫描并储存在 memroy.stats 里
    expect(memroy.stats).toHaveProperty('gclLevel', 1)
    expect(memroy.stats).toHaveProperty('gplLevel', 0)
    expect(memroy.stats).toHaveProperty('bucket')
    expect(memroy.stats).toHaveProperty('cpu')
})
