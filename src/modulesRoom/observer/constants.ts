import { ObserverContext } from './types'

export const defaultContext: Partial<ObserverContext> = {
    pbMax: 1,
    depoMax: 2,
    depoMaxCooldown: 100,
    obInterval: 10,
    pbFlagPrefix: 'pb',
    depoFlagPrefix: 'depo',
    depositHarvesterRole: 'depositHarvester',
    pbAttackerRole: 'pbAttacker',
    pbHealerRole: 'pbHealer',
    pbCarrierRole: 'pbCarrier'

}

/**
 * powerbank 的采集阶段
 */
export enum PbHarvestState {
    /**
     * 正在拆除
     */
    Attack = 1,
    /**
     * 快拆完了，carrier 准备过来
     */
    Prepare,
    /**
     * 拆除完成，正在搬运
     */
    Transfer
}
