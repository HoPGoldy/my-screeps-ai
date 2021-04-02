import { resolve } from 'path'
import { getServer, setBaseRoom } from '@test/serverUtils'
import { build } from '@test/moduleUtils'

let getStrBytes = function (str) {
    if (str == null || str === undefined) return 0;
    if (typeof str != "string") {
        return 0;
    }
    var total = 0, charCode, i, len;
    for (i = 0, len = str.length; i < len; i++) {
        charCode = str.charCodeAt(i);
        if (charCode <= 0x007f) {
            total += 1;//字符代码在000000 – 00007F之间的，用一个字节编码
        } else if (charCode <= 0x07ff) {
            total += 2;//000080 – 0007FF之间的字符用两个字节
        } else if (charCode <= 0xffff) {
            total += 3;//000800 – 00D7FF 和 00E000 – 00FFFF之间的用三个字节，注: Unicode在范围 D800-DFFF 中不存在任何字符
        } else {
            total += 4;//010000 – 10FFFF之间的用4个字节
        }
    }
    return total;
};

it('全局状态扫描可用', async () => {
    const server = await getServer()
    await setBaseRoom(server)

    const modules = await build(resolve(__dirname, './main.ts'))
    const bot = await server.world.addBot({ username: 'log 测试 a', room: 'W0N1', x: 25, y: 25, modules })

    for (let i = 0; i < 2; i++) {
        await server.tick()
    }

    const data = await bot.getSegments([1, 2])
    console.log('之前', data[1])
    console.log('之后', data[0])
})