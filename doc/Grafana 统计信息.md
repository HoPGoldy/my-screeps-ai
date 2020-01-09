# Grafana 统计信息

本文介绍要统计的信息以及信息统计模块的设计

# 统计信息

## 全局

- GCL 当前进度
- GPL 当前进度
- cpu 当前使用
- memory 使用百分比
- cpu 历史使用 / bucket 历史容量

## 房间

- storage 中的剩余能量
- terminal 中的战斗化合物以及 power
- nuker 状态

# 信息收集

在全局运行一个信息收集器 `globalStateScanner`，该模块会定期扫描全局信息并存储在 `Memory` 中。

房间中的信息由对应的建筑负责，每个建筑会定期扫描自己负责的信息并写入 `Room.memory`。

`setting` 中创建 `stateScanInterval` 来统一管理扫描间隔。

# 持久化

Memory.stats

```ts
{
    // GCl/GPL 升级百分比及等级
    gcl: number
    gclLevel: number
    gpl: number
    gplLevel: number
    // CPU 当前数值
    CPU: number
    // 内存使用百分比
    memory: number
    // bucket 当前数值
    bucket: number
}
```

Room.memory.stats
```ts
{
    // storage 中的能量剩余量
    energy: number
    // 终端中的战斗化合物数量
    [RESOURCE_CATALYZED_GHODIUM_ACID]: number
    // ...
    // 终端中的 power 数量
    power: number
    // nuker 的资源存储量
    nukerEnergy: number
    nukerG: number
}
```