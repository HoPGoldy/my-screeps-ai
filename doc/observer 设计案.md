# Observer 设计案（已实装）

## 目标

- 包含一套用户接口可以配置要扫描的区域和最大采集数量
- 检测指定房间的 deposit 和 powerBank 并自动插旗

## CLI 设计

已实装，详见 `StructureObserver.help()`

## 流程

- 如果房间存在对应内存的话（玩家在 `Obsrever.add` 时会新建）
- 如果没有暂停
- 如果不存在 `checkRoomName` 字段
  - 定期执行
  - 获取要查看的房间
  - ob 该房间
    - 如果 ob 成功则缓存其名称
  - 更新索引
- 如果存在 `checkRoomName` 字段（已经有 ob 过的房间等待查看了）
  - 获取上一tick查询的房间
  - 查找 deposit 和 powerBank 并插旗（旗帜名称 "资源类型 + 房间名 + 当前时间"）
  - 更新获取到的资源
  - 移除 `checkRoomName`