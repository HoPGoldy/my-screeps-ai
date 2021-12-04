# Link 设计案（已实装）

## 职责

Link 分为 **来源（SourceLink）**、**中央（CenterLink）** 以及 **升级（UpgradeLink）** 三种职责。

## 默认职责

Link 在刚建好时会进行检查，如果附近两格内有 Source 则默认分配为来源 Link。

如果紧邻着中央物流管理员的发布旗帜，则分配为中央 Link。

上述条件都不满足则默认分配为升级 Link。

## 职责关系

### 1. SourceLink

在能量快满时将把能量发送给 CenterLink。

### 2. CenterLink

会优先把能量供给给 UpgradeLink，在 UpgradeLink 能量足够并且自身能量快满时发布中央物流任务来把自己的能量转移给 Storage。

### 3. UpgradeLink

发现自己能量不足时会检查中央集群的能量，并发布将能量转移到 CenterLink 的中央物流任务。

## 职责存储形式

在房间内存中存有两个字段 `centerLinkId` 和 `upgradeLinkId`，其值为对应的 Link.id。

Link 在工作前会先检查，如果这两个字段都对不上自己的 id，那么自己就是来源 link。