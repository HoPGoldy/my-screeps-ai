# creep 控制协议设计案（已实装）

# 目标

将 creep 配置转移至内存，做到不修改代码就可以让建筑或者玩家发布 creep。

# 原则

creep 是服务于 structure 的，每个 creep 必然有其所隶属的 structure。房间的运维由 structure 管理，structure 在需要完成自己能力之外的工作时，就会孵化 creep 来执行。

# 简述

全局维护一个 creep 控制模块，该模块包括一个 **creep 配置项（Object）**，键为 creep 的名称，值为该 creep 的具体配置项（要做什么）。除此之外还有一组 **api 接口**，以供 structure 发布自己需要的 creep。creep 控制模块在接收到新发布的 creep 时就会将其推送到对应房间的 spawn 生产队列。

spawn 在孵化 creep 时会从全局配置项中读取该 creep 对应的配置项，并将其写入 creep 的内存，孵化之后 creep 将根据自己内存中的配置来工作，在其死亡后，creep 数量控制器会发现死去的 creep。并查询全局配置项，如果全局配置项中已经不存在对应的配置项时，该 creep 将不再会生成。若配置项依旧存在，则 creep 会执行 isNeed 阶段，如果该阶段返回成功则重新推送孵化任务开始新的循环。

# 设计

**GlobalCreepController**

全局控制模块，包括 creep 配置项与一套 api，如下：

**creepConfigs**

```ts
{
    // 每个 creep 的名称与其配置项
    [creepName: string]: {
        // 该 creep 的角色
        role: string,
        // creep 的具体配置项，每个角色的配置都不相同
        data: object,
        // 执行 creep 孵化的房间名
        room: string
    }
}
```

**creepApi**

```ts
// 添加新的 creep
// 通过后会向指定房间发布孵化任务
add(creepName: string, data: object, spawnRoom: string): ScreepsReturnCode

// 移除配置项
// 不会直接杀死该 creep
remove(creepName): ScreepsReturnCode

// 定期调用，发现死亡 creep 并触发相应事件
numberListener(): void
```

# isNeed 阶段

【可选】决定 creep 在死后是否需要再次孵化，为空时默认孵化

# prepare 阶段

【可选】creep 在进入 source/target 状态机之前要执行的额外阶段，在该方法返回 true 时进入 source 阶段。

# source 阶段

【可选】creep 在 target 阶段返回 false 时要执行的操作，主要用于获取工作所需的资源，该阶段返回 true 将在下个 tick 执行 target 阶段，返回 false 将在下个 tick 继续执行该阶段。

# target 阶段

creep 执行的工作逻辑，在需要的资源不足时返回 true。返回 false 将在下个 tick 继续执行该阶段。

# creep 发布

- controller 1 级：
    - [W1N1 harvester1]: harvester 采0矿
    - [W1N1 upgrader1]: upgrader 采1矿
- controller 8 级：
    - 出现 Downgrade 时发布 upgrader
- 建筑工地：
    - [W1N1 builder1]：builder 采0矿
- storage：
    - [W1N1 harvester1]: collector 采0矿 目标建筑为storage
    - [W1N1 harvester2]: collector 采1矿 目标建筑为storage
    - [W1N1 upgrader1]: upgrader 从storage里拿
    - [W1N1 transfer]: transfer 从storage里拿
- centerLink 上线：
    - [W1N1 centerTransfer]: centerTransfer 需要玩家插旗指定站桩位置
- sourceLink 上线：
    - 修改最近 source 对应 collector 的目标建筑为sourceLink
- observer 发现 pb：
    - 根据周边墙体数量发布 [W1N1 pbAttack] 和 [W1N1 pbHealer]
- pbAttack 估摸着快拆完了：
    - 根据指定数量发布 [W1N1 pbTransfer]