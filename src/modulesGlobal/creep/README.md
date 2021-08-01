# creep 管理模块

该模块包含 **creep 数量监听** 和 **creep 管理工具** 两部分内容。

## 数量监听

会对比 `Game.creeps` 的数量和上个 tick 有没有变化，有的话就会触发 creep 死亡检查，重新孵化或者停止孵化 creep。

## 管理工具

位于 `./utils.ts` 中，虽然名字平平无奇，但是整个项目的 creep 增删改最终都会调用这些方法。是 creep 配置项变更的统一端口。

## 关于 waitSpawnCreeps

在全局有一个对象 waitSpawnCreeps 记录了所有的待孵化 creep，他的作用是让 creep 管理工具更全面的对 creep 进行控制。因为 creep 一共有三种状态：

- 存活中，可以在 Game.creeps 里找到
- 死了但还没有被 creep 数量监听模块发现，可以在 Memory.creeps 里找到
- 被发现后添加了孵化任务，但是还没有被孵化，**可以从全局的 waitSpawnCreeps 里找到**

如果没有 waitSpawnCreeps 的话，管理工具就丧失了对应状态的 creep 的管理。