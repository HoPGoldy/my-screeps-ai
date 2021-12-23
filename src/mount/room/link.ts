import { createLinkController } from '@/modulesRoom/link'
import { TransportTaskType } from '@/modulesRoom/taskTransport/types'
import { createEnvContext } from '@/utils'
import { sourceUtils } from '../global/source'
import { getLink } from './shortcut'

declare global {
    interface RoomMemory {
        /**
         * 中央 link 的 id
         */
        centerLinkId?: Id<StructureLink>
        /**
         * 升级 link 的 id
         */
        upgradeLinkId?: Id<StructureLink>
    }
}

export const getLinkController = createLinkController({
    getMemory: room => room.memory,
    getLink,
    transferEnergy: (fromStructure, toStructure, amount) => {
        fromStructure.room.transport.addTask({
            type: TransportTaskType.CenterLink,
            need: 1,
            priority: 8,
            requests: [{
                from: fromStructure.id,
                to: toStructure.id,
                amount,
                resType: RESOURCE_ENERGY
            }]
        }, { dispath: true })
    },
    hasTransferTask: room => {
        return room.transport.hasTaskWithType(TransportTaskType.CenterLink)
    },
    getEnergyStructure: room => room.storageController.getResourcePlace(RESOURCE_ENERGY),
    getSourceLink: sourceUtils.getLink,
    onLinkBindToSource: (link, source) => {
        sourceUtils.setLink(source, link)
        // 如果旁边有 container 的话就执行摧毁，因为有了 link 就不需要 container 了
        const nearContainer = sourceUtils.getContainer(source)
        nearContainer && nearContainer.destroy()
    },
    env: createEnvContext('link')
})
