/**
 * 让所有自己的建筑动起来
 * 
 * 遍历所有建筑，如果建筑上有 work 方法, 则执行该方法
 */
export default function () {
    for (const name in Game.structures) {
        const structure: Structure = Game.structures[name]

        if (structure.work) structure.work()
    }
}