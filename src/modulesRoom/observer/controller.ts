import { DEPOSIT_MAX_COOLDOWN, OBSERVER_DEPOSIT_MAX, OBSERVER_INTERVAL, OBSERVER_POWERBANK_MAX } from './constant'
import { Color, colorful, createRoomLink } from '@/modulesGlobal/console'
import RoomAccessor from '../RoomAccessor'
import { ObserverMemory } from './types'

/**
 * Observer 拓展
 * 定期搜索给定列表中的房间并插旗
 */
export default class ObservserController extends RoomAccessor<ObserverMemory> {
    constructor(roomName: string) {
        super('observer', roomName, 'observer', {
            watchIndex: 0,
            watchRooms: [],
            pbList: [],
            depoList: []
        })
    }

    /** pb 资源插旗名称前缀 */
    readonly pbFlagPrefix = 'pb'

    /** depo 资源插旗名称前缀 */
    readonly depoFlagPrefix = 'depo'

    /** 本房间内的 observer */
    get observer() {
        return this.room[STRUCTURE_OBSERVER]
    }

    public run(): void {
        // 没有初始化或者暂停了就不执行工作
        if (!this.observer) return

        const { watchRooms, pause, pbList, depoList, checkRoomName } = this.memory
        if (watchRooms.length === 0) return
        if (pause) return
        // 都找到上限就不继续工作了
        if ((pbList.length >= OBSERVER_POWERBANK_MAX) && (depoList.length >= OBSERVER_DEPOSIT_MAX)) return

        // 如果房间没有视野就获取视野，否则就执行搜索
        if (checkRoomName) this.searchRoom()
        else if (!(Game.time % OBSERVER_INTERVAL)) this.obRoom()

        // 每隔一段时间检查下是否有 flag 需要清理
        if (!(Game.time % 100)) this.updateFlagList()
    }

    /**
     * 在房间内执行搜索
     * 该方法会搜索房间中的 deposits 和 power bank，一旦发现自动插旗
     */
    private searchRoom(): void {
        const { checkRoomName, depoList, pbList } = this.memory
        // 从内存中获取要搜索的房间
        const room = Game.rooms[checkRoomName]
        // 兜底
        if (!room) {
            delete this.memory.checkRoomName
            return
        }
        // this.log(`搜索房间 ${room.name}`)

        // 还没插旗的话就继续查找 deposit
        if (depoList.length < OBSERVER_DEPOSIT_MAX) {
            const deposits = room.find(FIND_DEPOSITS)
            // 对找到的 deposit 进行归档
            deposits.forEach(deposit => {
                // 冷却过长或者已经插旗的忽略
                if (deposit.lastCooldown >= DEPOSIT_MAX_COOLDOWN) return
                const flags = deposit.pos.lookFor(LOOK_FLAGS)
                if (flags.length > 0) return

                // 确认完成，插旗
                this.harvestDeposit(deposit)
                this.log(`${checkRoomName} 检测到新 deposit, 已插旗`, Color.Green)
            })
        }

        // 还没插旗的话就继续查找 pb
        if (pbList.length < OBSERVER_POWERBANK_MAX) {
            // pb 的存活时间大于 3000 / power 足够大的才去采集
            const powerBanks = room.find<StructurePowerBank>(FIND_STRUCTURES, {
                filter: s => s.structureType == STRUCTURE_POWER_BANK && s.ticksToDecay >= 3000 && s.power >= 2000
            })
            // 对找到的 pb 进行归档
            powerBanks.forEach(powerBank => {
                const flags = powerBank.pos.lookFor(LOOK_FLAGS)
                if (flags.length > 0) return
    
                // 确认完成，插旗
                this.harvestPowerBank(powerBank)
                this.log(`${checkRoomName} 检测到新 pb, 已插旗`, Color.Green)  
            })
        }

        // 查一下之前有没有采集资源的旗帜，如果有旗但没资源了说明采集任务失败了，移除旗帜
        const existFlags = room.find(FIND_FLAGS)
        existFlags.forEach(flag => {
            // 查 pb 旗子
            if (flag.name.startsWith(this.pbFlagPrefix)) {
                const existRes = flag.pos.lookFor(LOOK_STRUCTURES).filter(s => {
                    return s.structureType === STRUCTURE_POWER_BANK
                })
                if (existRes.length === 0) flag.remove()
            }
            // 查 depo 旗子
            else if (flag.name.startsWith(this.depoFlagPrefix)) {
                const existRes = flag.pos.lookFor(LOOK_DEPOSITS)
                if (existRes.length === 0) flag.remove()
            }
        })

        // 确认该房间已被搜索
        delete this.memory.checkRoomName
    }

    /**
     * 发布 pb 采集任务
     */
    private harvestPowerBank(target: StructurePowerBank) {
        const targetFlagName = `${this.pbFlagPrefix} ${this.room.name} ${Game.time}`
        target.pos.createFlag(targetFlagName)

        // 更新数量
        this.memory.pbList.push(targetFlagName)
        // 计算应该发布的采集小组数量，最高两组
        const groupNumber = target.pos.getFreeSpace().length > 1 ? 2 : 1
        // 发布 attacker 和 healer，搬运者由 attacker 在后续任务中自行发布
        this.room.spawner.release.pbHarvesteGroup(targetFlagName, groupNumber)
    }

    /**
     * 发布 depo 采集任务
     */
    private harvestDeposit(target: Deposit) {
        const targetFlagName = `${this.depoFlagPrefix} ${this.room.name} ${Game.time}`
        target.pos.createFlag(targetFlagName)

        // 更新数量
        this.memory.depoList.push(targetFlagName)
        // 发布采集者，他会自行完成剩下的工作
        this.room.spawner.release.depositHarvester(targetFlagName)
    }

    /**
     * 获取指定房间视野
     */
    private obRoom(): void {
        const { watchIndex, watchRooms } = this.memory
        // 执行视野获取
        const roomName = watchRooms[watchIndex]
        const obResult = this.observer.observeRoom(roomName)
        // this.log(`ob 房间 ${roomName}`)

        // 标志该房间视野已经获取，可以进行检查
        if (obResult === OK) this.memory.checkRoomName = roomName

        // 设置下一个要查找房间的索引
        this.memory.watchIndex = watchRooms.length & (watchIndex + 1)
    }

    /**
     * 初始化 observer
     */
    protected init(): void {
        this.room.memory.observer = {
            watchIndex: 0,
            watchRooms: [],
            pbList: [],
            depoList: []
        }
    }

    /**
     * 检查当前 depo 和 bp 旗帜是否失效
     * 会更新内存中的两个资源对应的 List 字段
     */
    public updateFlagList(): OK | ERR_NOT_FOUND {
        const { pbList, depoList } = this.memory

        this.memory.pbList = pbList.filter(this.checkAliveFlag)
        this.memory.depoList = depoList.filter(this.checkAliveFlag)

        return OK
    }

    /**
     * 检查旗帜是否失效
     * 会完成失效后的释放操作
     * 
     * @param flagName 要检查的旗帜名称
     */
    private checkAliveFlag(flagName): boolean {
        if (flagName in Game.flags) return true

        Memory.flags && delete Memory.flags[flagName]
        return false
    }

    /**
     * 显示当前监听的房间列表
     * 会高亮显示当前正在检查的房间
     */
    public showList(): string {
        const roomList = this.memory.watchRooms.map((room, index) => {
            if (index === this.memory.watchIndex) return colorful(room, Color.Green)
            else return room
        }).join(' ')

        return `监听中的房间列表: ${roomList}`
    }

    /**
     * 查看状态
     */
    public show(): string {
        const { watchRooms, pbList, depoList } = this.memory
        if (watchRooms.length === 0) {
            return `[${this.roomName} observer] 未启用，使用 .obhelp() 来查看更多用法`
        }

        let logs = [ `[${this.roomName} observer] 当前状态`, this.showList() ]

        // 更新旗帜列表，保证显示最新数据
        this.updateFlagList()

        // 正在采集的两种资源数量
        const pbNumber = pbList.length
        const depoNumber = depoList.length
        // 开采资源的所处房间
        const getFlagRoomLink = flagName => createRoomLink(Game.flags[flagName].pos.roomName)
        const pbPos = pbList.map(getFlagRoomLink).join(' ')
        const depoPos = depoList.map(getFlagRoomLink).join(' ')

        logs.push(`[powerBank] 已发现：${pbNumber}/${OBSERVER_POWERBANK_MAX} ${pbNumber ? '[位置]' : ''} ${pbPos}`)
        logs.push(`[deposit] 已发现：${depoNumber}/${OBSERVER_DEPOSIT_MAX} ${depoNumber ? '[位置]' : ''} ${depoPos}`)

        return logs.join('\n')
    }

    /**
     * 新增监听房间
     * 
     * @param roomNames 要进行监听的房间名称
     */
     public addWatchRoom(...roomNames: string[]) {
        // 确保新增的房间名不会重复
        this.memory.watchRooms = _.uniq([ ...this.memory.watchRooms, ...roomNames])
    }

    /**
     * 移除监听房间
     * 
     * @param roomNames 不再监听的房间名
     */
    public removeWatchRoom(...roomNames: string[]) {
        this.memory.watchRooms = _.difference(this.memory.watchRooms, roomNames)
    }

    /**
     * 清空监听房间列表
     */
     public clearWatchRoom() {
        this.memory.watchRooms = []
    }

    /**
     * 暂停 observer
     */
    public off() {
        this.memory.pause = true
    }

    /**
     * 重启 observer
     */
    public on() {
        delete this.memory.pause
    }
}
