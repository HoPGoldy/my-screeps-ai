# powerCreep 设计案（设计阶段）

## 设计思路

建立一个配置项，其中包含了每种 power 对应的检查规则和工作内容。

powerCreep 会定期遍历自己的 `.powers` 属性，并执行上面配置项中的检查规则，一旦规则不满足，则执行对应的 power 强化工作。

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