# 跨 shard 设计案

本模块旨于解决如何在多个 shard 之间传递信息的问题

# 概念

本小节包含了和跨 shard 相关的一些概念。

## 1、信息

每个 shard 的 InterShardMemory 都是一个对象，而该对象的每个键值对都被称为一个信息，信息的构成如下：


```js
// InterShardMemory
{
    // 键，下文将称为信息的名字
    'harvester-2312333': {
        // 值，下文将称为信息的内容
        /* ... */
    }
}
```

## 2、请求

请求是消息的一种，代表了该 shard 想让其他 shard 执行的操作。请求将被发布在自己的 InterShardMemory 上，每个 shard 都会定时检查其他 shard 的 InterShardMemory，并通过请求的 to 字段获取哪些请求是需要自己处理的。请求的消息内容如下：

```js
'harvester-2312333': {
    // 该消息的目标 shard
    to: 'shard2',
    // 该消息的类型，想让目标 shard 干什么事
    type: 'sendCreep',
    // 该消息携带的内容，目标 shard 将结合 type 来执行具体的操作
    data: { /* ... */ }
}
```

## 3、响应

响应也是消息的一种，代表了自己已经完成了某个 shard 的请求。我们规定，响应的名字一定是 `请求的shard名:` + `请求的名字`。和请求一样，响应也将发布在自己的 InterShardMemory，一旦其他 shard 发现自己的请求有了响应，就会移除掉对应的请求。

和请求不同，响应的消息内容是一个 ScreepsReturnCode 值，代表了该请求是否处理完成：

```js
// 响应 shard3 的 harvester-2312333 请求
'shard3:harvester-2312333': OK
```

# 生命周期

下面以传递 creep 到其他 shard 为例说明跨 shard 消息的生命周期：

## 阶段1 - 发送请求（shard A）

creep 在发现自己需要跨 shard 时，会访问本模块发送请求。本模块受到 creep 的调用时，会在自己的 InterShardMemory 中发布一个请求，请求包含了目标 shard 的名字，请求类型（发送 creep）以及请求内容（creep 的内存）。

## 阶段2 - 处理请求（shard B）

目标 shard 会定期遍历其他 shard 的 InterShardMemory，当它发现了 shardA 提交了一个指向自己的请求时，它会根据请求类型（发送 creep）执行对应的操作（将请求中携带的 creep 内存保存到自己的 Memory 中）。

## 阶段3 - 发布响应（shard B）

在完成阶段 2 的工作后，目标 shard 会立刻在自己的 InterShardMemory 里发布一个针对该请求的响应，标志着自己已经处理完了该请求。

## 阶段4 - 关闭请求（shard A）

在阶段 1 发布完请求之后，shardA 会继续进行监听，当发现目标 shard 发布了请求的响应后，shardA 将会移除请求，并根据响应的值（请求是否完成）来执行后续的操作。

## 阶段5 - 关闭响应（shard B）

在阶段 2 处理完请求后，shardB 同样会定期监听，并对自己 InterShardMemory 中的响应做出特殊处理：检查对应 shard 的请求是否依然存在。若存在则保持不变，若对方的请求消失了，则说明对方已经收到了自己的响应，将对应响应从 InterShardMemory 中移除。至此，跨 shard 信息交互结束。