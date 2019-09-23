import scan from './room.rader';
import towerWork from './room.tower';
import { getRoomList } from './utils';
export default function () {
    for (const roomName of getRoomList()) {
        const room = Game.rooms[roomName];
        if (!(roomName in Memory))
            initRoom(room);
        scan(room);
        towerWork(room);
    }
}
function initRoom(room) {
    Memory[room.name] = {
        radarResult: {}
    };
}
