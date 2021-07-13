# 房间能量管理工具函数

提供以下功能：

- 统计能量相关数据 countEnergyChangeRatio：该方法应定期调用
- 获取当前房间中最合适的能量来源 getRoomEnergyTarget：该方法应由需要能量的 creep 调用

findStrategy 中包含了一系列预定义好的搜索策略

该模块依赖于 shortcut 和 stateCollector 模块