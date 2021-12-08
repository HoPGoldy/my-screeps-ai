import { TransportTaskType } from '@/modulesRoom'
import { createHelp, createEnvContext } from '@/utils'
import { createStorageController } from '@/modulesRoom/storage/storageController'

export const getStorageController = createStorageController({
    requestShareRoom: (room, resType, amount) => room.share.request(resType, amount),
    addPowerStroageTask: room => room.share.becomeSource(RESOURCE_ENERGY),
    canShareEnergy: room => room.share.becomeSource(RESOURCE_ENERGY),
    addTransportTask: (room, requests) => {
        // 要先移除再添加，防止重复搬运
        room.transport.removeTaskByType(TransportTaskType.StorageBlance)
        room.transport.addTask({
            type: TransportTaskType.StorageBlance,
            requests
        })
    },
    env: createEnvContext('storage')
})

/**
 * Storage 的用户访问接口
 */
export class StorageConsole extends Room {
    /**
     * 手操在 storage 和 terminal 之间进行资源平衡
     * 以及 sb 是 storage balance 的缩写
     */
    sb () {
        this.storageController.runBalanceResource()
    }

    /**
     * 手动请求能量
     */
    getenergy () {
        this.storageController.requestEnergyCheck(this)
    }

    public shelp () {
        return createHelp({
            name: 'Storage 控制台',
            describe: '在多房间之间共享能量，维持 terminal 中的资源储量',
            api: [
                {
                    title: '执行资源平衡',
                    describe: '在 terminal 和 sotrage 中调度资源，防止终端被塞满',
                    functionName: 'sb'
                },
                {
                    title: '发起能量请求检查',
                    describe: '如果能量不足的话可以调用这个命令手动请求其他房间进行共享（会在能量不足时定期自动执行）',
                    functionName: 'getenergy'
                }
            ]
        })
    }
}
