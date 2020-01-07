# powerCreep 设计案（设计阶段）

## 设计思路

建立一个配置项，其中包含了每种 power 对应的检查规则和工作内容。

powerCreep 会定期遍历自己的 `.powers` 属性，并执行上面配置项中的检查规则，一旦规则不满足，则执行对应的 power 强化工作。

## 工作配置项

工作配置项应分为三部分：检查条件、资源获取、工作。

- **检查条件(needExecute)**：该方法返回 true 时才会执行该项 power 工作
- **资源获取(source)**：该方法一般都是去获取 ops，可选
- **工作(target)**：进行工作，例如强化 Source，或者强化 Factory

这个配置和 creep 是比较像的，但是没有 switch 阶段，现在的工作状态是根据 source 和 target 的返回值决定的。**注意**：请把状态切换条件写在 source / target 的结尾，避免出现在条件满足后那一 tick 什么都不干的问题出现。

**实验性设计**：这里取消 switch 阶段是因为之前的 creepConfig 配置中 switch 和 source / target 中有很多信息需要重复获取，浪费了 cpu。这里用于比较和普通 creepConfig 的区别。

## 持久化

powerCreep.memory

```js
{
    // 接下来要检查哪个 power
    powerIndex: 0, 
    // 当前要处理的工作
    // 字段值均为 PWR_* 常量
    // 在该字段不存在时将默认执行 PWR_GENERATE_OPS（如果 power 资源足够的话）
    task: PWR_GENERATE_OPS
}
```