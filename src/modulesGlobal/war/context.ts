import { createContext, RoomTileMap } from "@/utils";
import { RoomInfo } from "./types";

export const contextRoomInfo = createContext<(roomName: string) => RoomInfo | undefined>()

export const contextCostMatrix = createContext<(roomName: string) => CostMatrix | undefined>()

export const contextEnemyDamage = createContext<(roomName: string) => RoomTileMap<number> | undefined>()

export const contextMoveCostCache = createContext<{ [cacheKey: string]: CostMatrix }>({})