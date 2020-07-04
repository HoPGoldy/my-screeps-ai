/**
 * 战斗小队模块
 * 实现了两人以上 creep 组成小组后的战斗逻辑，详见 doc/战斗小队设计案.md
 */
export default {
    /**
     * 执行指定小队逻辑
     * @param squadName 小队名称
     */
    main(squadName: string) {

    },

    /**
     * 建立小队
     * 
     * @param roomName 在哪个房间里查找队友
     */
    buildSquad(roomName: string) {

    },

    /**
     * 搜索路径
     * 
     * @param squad 小队成员
     * @param pathLength 要搜索的路径长度
     * @param flee 是否逃跑
     */
    getPath(squad: SquadMember, pathLength: number, flee: boolean) {

    },

    /**
     * 按路径移动
     * 
     * @param squad 小队成员
     * @param squadMemory 小队内存
     */
    moveByPath(squad: SquadMember, squadMemory: SquadMemory) {

    },

    /**
     * 检查小队方向和当前方向是否一致
     * 
     * @param squadMemory 小队内存
     * @param direction 当前方向
     */
    checkDirection(squadMemory: SquadMemory, direction: DirectionConstant) {

    },

    /**
     * 执行战术动作
     * 
     * @param action 要执行的战术动作
     */
    tacticalAction(action: SquadTacticalActions) {

    },

    /**
     * 解散小队
     * 
     * @param squad 小队成员
     * @param squadMemory 小队内存
     */
    dismiss(squad: SquadMember, squadMemory: SquadMemory) {

    },

    /**
     * 小队前进至指定房间
     * 
     * @param squad 小队成员
     */
    moveToRoom(squad: SquadMember) {

    }
}

/**
 * 所有小队的具体战斗逻辑
 */
const squadStrategies: {
    [squadType in SquadTypes]: SquadStrategy
} = {
    // 一体机 * 4
    apocalypse4: {
        // 小队组成
        member: {
            apocalypse: 4
        },

        // 小队战术动作
        tactical: {
            back: { '↖': '↘', '↗': '↙', '↙': '↗', '↘': '↖' },
            cross: { '↖': '↘', '↗': '↙', '↙': '↗', '↘': '↖' },
            right: { '↖': '↗', '↗': '↘', '↘': '↙', '↙': '↖' },
            left: { '↗': '↖', '↘': '↗', '↙': '↘', '↖': '↙' }
        },

        /**
         * 小队进行治疗
         * 
         * @param squad 小队成员
         */
        heal(squad: SquadMember) {

        },

        /**
         * 小队攻击敌方单位
         * 
         * @param squad 小队成员
         */
        attackCreep(squad: SquadMember) {

        },

        /**
         * 小队攻击敌方建筑
         * 
         * @param squad 小队成员
         */
        attackStructure(squad: SquadMember) {

        },

        /**
         * 检查队形
         * 
         * @param squad 小队成员
         * @returns 是否需要重整队伍
         */
        checkFormation(squad: SquadMember): boolean {
            return true
        },

        /**
         * 重新整队
         * 
         * @param squad 小队成员
         * @returns 是否集结完成
         */
        regroup(squad: SquadMember): boolean {
            return true
        },

        /**
         * 寻路回调
         * 
         * @param roomName 所在房间
         * @param costs 该房间的 costs
         */
        findPathCallback(roomName: string, costs: CostMatrix): CostMatrix {
            return costs
        },

        /**
         * 决定移动方向
         * 
         * @param healResult heal 方法的执行结果
         * @param attackCreepResult attackCreep 方法的执行结果
         * @param attackStructureResult attackStructure 方法的执行结果
         * @returns 是否继续前进（为 false 则后撤）
         */
        getMoveStrategy(healResult: any, attackCreepResult: any, attackStructureResult: any): boolean {
            return true
        }
    }
}