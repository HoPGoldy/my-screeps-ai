# powerCreep 设计案（已实装）

## 设计思路

建立一个配置项，其中包含了每种 power 对应的工作逻辑。

在房间中会有一个小型任务队列，每个任务都只是一个 `PWR_*` 常量。powerCreep 会检查这个队列并执行其中的任务，队列在新建时会推入第一个任务：”激活房间控制器“（编号 `-1`）。

如果任务队列中没有任务的话，powerCreep 会一直制作 ops 并塞入 terminal。并没有添加 ops 制作上限。

## keep alive

powerCreep 在出生后会定期检查自己的 ttl，一旦低于指定值就会优先访问 powerSpawn 给自己 `renew`。

## power 任务队列

`number[]` 类型的任务队列，每个元素就是对应的 `PWR_*` 常量。

## 工作配置项

工作配置项应分为两个部分：资源获取、工作。

- **资源获取(source)**：该方法一般都是去获取 ops，可选
- **工作(target)**：进行工作，例如强化 Source，或者强化 Factory

这个配置和 creep 是比较像的，现在的工作状态是根据 source 和 target 的返回值决定的。**注意**：请把状态切换条件写在 source / target 的结尾，避免出现在条件满足后那一 tick 什么都不干的问题出现。