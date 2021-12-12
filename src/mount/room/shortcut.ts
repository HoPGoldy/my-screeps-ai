import { createRoomShortcut } from '@/modulesRoom/shortcut/createRoomShortcut'

export const {
    getSpawn, getExtension, getRoad, getWall, getRampart, getKeeperLair, getLink,
    getTower, getLab, getContainer, getFactory, getPowerSpawn, getNuker, getObserver,
    getExtractor, getMineral, getSource, updateStructure
} = createRoomShortcut()
