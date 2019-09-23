/**
 * 扩张拓展
 */
export default function() {
    global.ex = expansionExtension
}

const expansionExtension = {
    // 将扩张计划写入 Memory
    start(sourceRoomName: string, targetRoomName: string): string {
        return `建立从 ${sourceRoomName} 到 ${targetRoomName} 的扩张计划`
    },
    // 将扩张计划从 Memory 移除
    cancel(sourceRoomName: string): string {
        return `取消 ${sourceRoomName} 的对外扩张`
    }
}

export function expansionListener() {

}