/**
 * 扩张拓展
 */
export default function() {
    global.ex = expansionExtension
}

const expansionExtension = {
    start(sourceRoomName: string, targetRoomName: string): string {
        return `建立从 ${sourceRoomName} 到 ${targetRoomName} 的扩张通道`
    },
    cancel(sourceRoomName: string): string {
        return `取消 ${sourceRoomName} 的对外扩张`
    }
}