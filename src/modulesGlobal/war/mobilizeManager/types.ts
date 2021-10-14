import { MobilizeState, MobilizeTask, UpdateMobilizeStateFunc } from "../types";

export type RunMobilizeStateFunc = (
    task: MobilizeTask,
    room: Room,
    updateState: UpdateMobilizeStateFunc
) => void

