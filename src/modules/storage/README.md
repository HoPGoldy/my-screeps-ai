# storage 设计案

storage 的职责非常简单，检查 terminal 中的资源存量，并将其按照规则进行平衡。

## 平衡规则

一个平衡规则包括 **资源种类**和 **数量** 两个属性。在执行平衡时，storage 会努力将 terminal 里的资源维持在规则所期望的数量上。例如如下规则：

```js
{ resourceType: RESOURCE_ENERGY, amount: 2000 }
```

若检查发现 terminal 里的能量不足 2000，就会从自己存储里取出能量将其补齐至 2000（不够就能补多少补多少），如果 terminal 里能量超过 2000，就会把多余的能量放在自己存储里。

## 被动触发

**storage 不会主动触发平衡检查**，因为 terminal 有时会主动从 storage 里取用资源，这时候如果进行平衡的话会出现：被搬到 terminal 里的资源又被 storage 搬了回来。
