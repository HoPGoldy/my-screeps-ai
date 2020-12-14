# creep 逻辑设计案（草案阶段）

## 元行为（action）

将工作都封装成行为，行为是最小单位，例如到一个地方、获取能量、升级控制器、运输资源到某个位置。

## 保存格式

每个 creep 的内存中都有一个 logic 字段，该字段保存了 creep 的工作逻辑，该字段为一个对象，格式如下：

```js
{
    // 阶段名，该名称完全由玩家自己定义
    prepare: {
        // ...其他该阶段的数据字段
        // 该阶段应该执行的元行为
        action: 'goTo',
        // 该阶段完成后应该执行哪个阶段
        next: 'action1'
    },
    action1: {
        // ...
        action: 'getEnergy',
        next: 'action2'
    },
    action2: {
        // ...
        action: 'upgraderController',
        next: 'action1'
    }
}
```

所有阶段的 next 字段都必须是一个可用的阶段名，如果不是的话在新建逻辑的时候会报错。

## 孵化

- 按照体型划分角色。