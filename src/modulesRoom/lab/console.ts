import { Color, colorful, createHelp } from '@/modulesGlobal/console'

/**
 * Room 上的 Lab 用户控制接口
 */
export default class LabConsole extends Room {
    /**
     * 初始化 lab 集群
     * 要提前放好名字为 lab1 和 lab2 的两个旗帜（放在集群中间的两个 lab 上）
     */
    public linit(labAId: Id<StructureLab>, labBId: Id<StructureLab>): string {
        const labA = Game.getObjectById(labAId)
        const labB = Game.getObjectById(labBId)

        if (!labA || !labB) return `[lab 集群] 初始化失败，找不到对应的 lab`

        this.myLab.setBaseLab(labA, labB)
        return `[${this.name} lab] 初始化成功，稍后将自动运行生产规划`
    }

    /**
     * 用户操作：暂停 lab 集群
     */
    public loff(): string {
        this.myLab.off()
        return `[${this.name} lab] 已暂停工作`
    }

    /**
     * 用户操作：重启 lab 集群
     */
    public lon(): string {
        this.myLab.on()
        return `[${this.name} lab] 已恢复工作`
    }

    /**
     * 用户操作：显示当前 lab 状态
     */
    public lshow(): string {
        return this.myLab.stats()
    }

    public fhelp(): string {
        return createHelp({
            name: 'Lab 控制台',
            describe: `lab 将会自动监听房间中的强化化合物数量并进行合成，需要先执行 linit 进行初始化`,
            api: [
                {
                    title: '初始化底物 lab',
                    describe: '初始化方法，设置完该方法后才可以运行自动合成',
                    params: [
                        { name: 'labAId', desc: '第一个底物 lab 的 id' },
                        { name: 'labBId', desc: '第二个底物 lab 的 id'}
                    ],
                    functionName: 'linit'
                },
                {
                    title: '显示 lab 详情',
                    functionName: 'lshow'
                },
                {
                    title: '暂停化合物反应',
                    functionName: 'loff'
                },
                {
                    title: '重启化合物反应',
                    functionName: 'lon'
                }
            ]
        })
    }
}