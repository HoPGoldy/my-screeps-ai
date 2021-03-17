import { getServer, setBaseRoom } from '@test/serverUtils'
import { getMyCode } from '@test/moduleUtils';

it('simple', async () => {
    const server = await getServer()
    const modules = await getMyCode()
    await setBaseRoom(server)

    await server.world.addBot({ username: 'bot 启动', room: 'W0N1', x: 25, y: 25, modules });

    for (let i = 0; i < 10; i++) {
        await server.tick()
    }
})