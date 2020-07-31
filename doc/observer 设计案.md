# Observer 设计案（已实装）

## 目标

- 包含一套用户接口可以配置要扫描的区域和最大采集数量
- 检测指定房间的 deposit 和 powerBank 并自动插旗

## CLI 设计

详见 `StructureObserver.help()`

## 流程

- 如果房间存在对应内存的话（玩家在 `Obsrever.add` 时会新建）
- 如果没有暂停
- 如果不存在 `checkRoomName` 字段
  - 定期执行
  - 获取要查看的房间
  - ob 该房间
    - 如果 ob 成功则缓存其名称
  - 更新索引
- 如果存在 `checkRoomName` 字段（已经有 ob 过的房间在等待查看了）
  - 获取上一 tick 查询的房间
  - 查找 deposit 和 powerBank 并插旗（旗帜名称 "资源类型 + 房间名 + 当前时间"）
  - 更新获取到的资源
  - 移除 `checkRoomName`

## 资源采集

目前 observer 仅用于采集资源过道资源，在发现 deposit 和 powerBank 时将会自行发布对应的采集单位。