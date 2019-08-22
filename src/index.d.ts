declare var module: any

interface Memory {
    spawnList: string[]
}

interface IWorkOperation {
    func: string
    args: any[]
}

interface ICreepConfig {
    source: IWorkOperation
    target: IWorkOperation
    spawn: string
    bodys: BodyPartConstant[]
}

interface ICreepConfigs {
    [creepName: string]: ICreepConfig
}