interface WorkOperation {
    func: string
}

interface CreepConfig {
    name: string
    source: WorkOperation
    target: WorkOperation
    spawn: string
}