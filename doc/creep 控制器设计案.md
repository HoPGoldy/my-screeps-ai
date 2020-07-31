# creep 控制器设计案（已实装）

在 Memory 中存在一个全局 creep 配置对象，键为 creep 的名称，值为该 creep 的具体配置项包含了该 creep 要做什么、身体配置以及孵化房间。

除此之外还有一组 **api 接口**，以供其他模块发布自己需要的 creep。控制模块在收到 creep 发布请求时会将其推送到对应房间的 spawn 生产队列。

# creep 循环周期

## 孵化阶段

spawn 在孵化 creep 时会从全局配置项中读取该 creep 对应的配置项，并根据配置项初始化 creep。

## 准备阶段

孵化完成后 creep 将进入准备阶段，例如抵达指定位置或进行强化等。若没有准备阶段则直接进入工作阶段。

## 工作阶段

准备完成后 creep 将根据自己内存中的配置和角色进行工作，并根据 source / target 方法的返回值切换下个 tick 要执行的工作。

## 回收阶段

死亡后，creep 数量控制器会发现死去的 creep 并查询全局配置项，如果全局配置项中已经不存在对应的配置项时，该 creep 将不再会生成。

若配置项依旧存在，则 creep 会执行 isNeed 方法，并根据该方法的返回值决定是否要继续孵化。

# creep 生命周期

## isNeed 阶段

【可选】决定 creep 在死后是否需要再次孵化，返回 true 会再次孵化，返回 false 将不再孵化。为空时默认持续孵化。

## prepare 阶段

【可选】creep 在进入 source/target 状态机之前要执行的额外阶段，在该方法返回 true 时进入 source 阶段。

## source 阶段

【可选】creep 在 target 阶段返回 false 时要执行的操作，主要用于获取工作所需的资源，该阶段返回 true 将在下个 tick 执行 target 阶段，返回 false 将在下个 tick 继续执行该阶段。

## target 阶段

creep 执行的工作逻辑，返回 true 将在下个 tick 执行 source 阶段，返回 false 将在下个 tick 继续执行该阶段。

# 设计

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
```

**controller**

creep 数量控制器，定期调用，负责发现死亡 creep 并触发相应事件

```
numberListener(): void
```