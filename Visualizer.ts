import { rootCertificates } from "tls";

const TEXT_COLOR = '#c9c9c9';
const TEXT_SIZE = .8;
const CHAR_WIDTH = TEXT_SIZE * 0.4;
const CHAR_HEIGHT = TEXT_SIZE * 0.9;

/**
 * The Visualizer contains many static methods for drawing room visuals and displaying information through a GUI
 */
export class Visualizer {
	private static textStyle(size = 1, style: TextStyle = {}) {
		return _.defaults(style, {
			color  : TEXT_COLOR,
			align  : 'left',
			font   : `${size * TEXT_SIZE} Trebuchet MS`,
			opacity: 0.8,
		});
	}
	static text(text: string, pos: { x: number, y: number, roomName?: string }, size = 1, style: TextStyle = {}): void {
		new RoomVisual(pos.roomName).text(text, pos.x, pos.y, this.textStyle(size, style));
	} 

	static barGraph(progress: number | [number, number], pos: { x: number, y: number, roomName?: string },
					width = 7, scale = 1): void {
		const vis = new RoomVisual(pos.roomName);
		let percent: number;
		let mode: 'percent' | 'fraction';
		if (typeof progress === 'number') {
			percent = progress;
			mode = 'percent';
		} else {
			percent = progress[0] / progress[1];
			mode = 'fraction';
		}
		// Draw frame
		this.box(vis,pos.x, pos.y - CHAR_HEIGHT * scale, width, 1.1 * scale * CHAR_HEIGHT, {color: TEXT_COLOR});
		vis.rect(pos.x, pos.y - CHAR_HEIGHT * scale, percent * width, 1.1 * scale * CHAR_HEIGHT, {
			fill       : TEXT_COLOR,
			opacity    : 0.4,
			strokeWidth: 0
		});
		// Draw text
		if (mode == 'percent') {
			vis.text(`${Math.round(100 * percent)}%`, pos.x + width / 2, pos.y - .1 * CHAR_HEIGHT,
					 this.textStyle(1, {align: 'center'}));
		} else {
			const [num, den] = <[number, number]>progress;
			vis.text(`${num}/${den}`, pos.x + width / 2, pos.y - .1 * CHAR_HEIGHT,
					 this.textStyle(1, {align: 'center'}));
		}

	}
	
	static drawGraphs(): void {
		this.text(`CPU`, {x: 1, y: 2});
		this.barGraph((Game.cpu.getUsed() / Game.cpu.limit), {x: 4.5, y: 2});
		this.text(`BKT`, {x: 1, y: 3});
		this.barGraph((Game.cpu.bucket / 10000), {x: 4.5, y: 3});
		this.text(`GCL`, {x: 1, y: 4});
		this.barGraph((Game.gcl.progress / Game.gcl.progressTotal), {x: 4.5, y: 4});
		this.text(`等级:${Game.gcl.level}`,{x:13,y:4});
		this.text(`GPL`, {x: 1, y: 5});
		this.barGraph((Game.gpl.progress / Game.gpl.progressTotal), {x: 4.5, y: 5});
		this.text(`等级:${Game.gpl.level}`,{x:13,y:5});
		var i=0;
		for(const room in Game.rooms)
		{
			try {
				if(Game.rooms[room].controller.my)
				{
					i++;	
					const rclProgress=Game.rooms[room].controller.progress;
					const rclProgressTotal=Game.rooms[room].controller.progressTotal;
					const level=Game.rooms[room].controller.level;
					this.text(`${Game.rooms[room].name}:`,{x:1,y:(i+5)});
					this.barGraph((rclProgress / rclProgressTotal), {x: 4.5, y: (i+5)});
					this.text(`等级:${level}`,{x:13,y:(i+5)});
					if(Game.rooms[room].controller.level!=8)
					{
						this.text(`${Game.rooms[room].controller.progressTotal-Game.rooms[room].controller.progress}`,{x:Game.rooms[room].controller.pos.x+1,y:Game.rooms[room].controller.pos.y,roomName:room})
					}
				}
				else if(Game.rooms[room].controller.reservation.username=='EricGuo')
				{
					i++;
					const reservationProgress=Game.rooms[room].controller.reservation.ticksToEnd;
					const reservationTotal=5000
					this.text(`${Game.rooms[room].name}:`,{x:1,y:(i+5)});
					this.barGraph([reservationProgress,reservationTotal], {x: 4.5, y: (i+5)});
				}
			} catch (error) {
				
			}
		}
	}

	static summary(): void {
		this.text(`有视野房间数量: ${_.keys(Game.rooms).length} | 共有: ${_.keys(Game.creeps).length}个Creep`, {
			x: 1,
			y: 1
		}, .93);
	}
	static box(vis:RoomVisual,x: number, y: number, w: number, h: number, style?: LineStyle): RoomVisual {
		return vis.line(x, y, x + w, y, style)
				   .line(x + w, y, x + w, y + h, style)
				   .line(x + w, y + h, x, y + h, style)
				   .line(x, y + h, x, y, style);
	};
	static visuals(): void {
		this.drawGraphs();
		this.summary();
	}
}
