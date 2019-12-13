# Boost 设计案

本设计案建立在 lab 设计案和房间物流设计案已实装的基础上。

# 目标

- 哪怕 lab 集群已被损毁，只要保证所需的最少 lab 数量，就可以进行强化。
- 强化不应影响 lab 集群的正常化合反应。
- 控制强化的模块应独立于每个房间，保证可以多个房间同时进行强化。

# Room 原型拓展

启动 boost 进程：为指定的强化类别准备对应的化合物

```js
Room.boost(boostType)
```

强化指定 creep，由该 creep 在 prepare 阶段抵达指定位置后自动调用。

```js
Room.boostCreep(creep)
```

取消当前 boost 进程：将已经填进 lab 的化合物移会 terminal

```js
Room.cboost()
```

# 模块化

boost 控制器应拆分成 **流程控制器** 和 **基础资源检查**：

**流程控制器**

在检查到房间中出现 boost 任务后唤醒，负责调控 boost 阶段以及强化阶段的切入 / 切出。强化阶段共分为三个子阶段：**资源移入、等待强化、资源清理**。

**基础资源检查**

在用户调用 `Room.boost` 时触发，检查房间中的资源是否充足（不足直接终止 boost 进程），lab 是否正处于工作中（getTarget 阶段直接切换为 boost 阶段，其他阶段则暂时等待），能量是否充足（不足则发布 lab 能量填充任务），并在满足条件后发布 boost 任务。

# 强化单位设计

- isNeed 阶段：房间中的 boost 任务处于“等待强化”阶段时生成，否则不生成。
- prepare：向指定位置移动，移动到之后执行 `Room.boostCreep` 强化自己
- isReady 阶段：是否已经强化完成

# 流程

**boost creep 流程**

- creepConfig 新建 boost 单位
- isNeed: 检查是否有 [房间名 + Boost] 的旗帜存在
- 不存在，弹出提示，return
- 存在，查看当前房间是否存在 boost 任务
    - 不存在, 检查资源数量
        - 合适则发布 boost 任务, return
        - 不合适则 return
- 检查 boost 任务是否是属于自己？
    - 不是，等待，return
- 检查 boost 任务阶段
    - 资源移入阶段, return
    - 等待强化阶段, 
        - 有，开始生成
        - 没有，弹出 log，return
- prepare: 是否抵达指定位置？
    - 是，执行 `Room.boostCreep`, 执行结果是否正常？
        - 正常，准备完成
        - 不正常，打印 log，原地待命
    - 否，移动

**boost 模块流程**

- 检查是否有 Room.memory.boost 任务
    - 没有，待机，return
- lab 集群正处于什么阶段？
    - 不是 getTarget，待机，return
    - 是 getTarget，将其修改为 boost
- boost 任务正处于什么阶段？
    - 资源移入阶段：检查资源是否到位
        - 已到位，将状态切换为 waitBoost，return
        - 没到位，检查是否有 boostGet 任务存在
            - 有，return
            - 没有，发布任务
    - 等待强化阶段：啥都不干（直到 creep 执行 Room.boostCreep）
    - 资源清理阶段：检查资源是否清空
        - 已清空，将 lab 集群的阶段切换为 getTarget，移除 boost 任务，return
        - 没到位，检查是否有 boostClear 任务存在
            - 有，return
            - 没有，发布任务

# 问题

- boost 要在 creep 生成前准备对应的强化材料，但是 boost 模块和 spawn 模块怎么协商要生成的身体部件数量？
    - 解决方案：升级 spawn 模块，boost creep 在生成时会按照房间最大能量进行生成。boost 模块会始终按照最大身体数量进行资源转移，在强化完成后再将剩余的资源移回 terminal。