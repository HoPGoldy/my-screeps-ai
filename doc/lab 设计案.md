# Lab 设计案（已实装）

# 目标

- 搭建完之后执行初始化命令就可以让 lab 集群自动工作。
- 工作目标是自动合成数量不足的化合物并存放至 terminal 中。

# 前提

- lab 集群必须以固定布局搭建，并且初始化命令中传入的必须是指定位置（inLab）。
- 存在房间物流模块可以处理资源转移任务。
- lab 集群不关心底物的来源，玩家可以通过 terminal 模块自定义自己的资源获取渠道。

# CLI 设计

初始化 lab 集群
```js
Room.linit() // 执行前需要在两个 InLab 上新建旗帜
```

# 思路

lab 将作为一个整体运行，每 tick 第一个执行 work 的 lab 将会运行资源存取策划，其他的只是被动接收资源。

# Lab 原型拓展

- 检查 `Room._hasRunLab` 字段，如果为 false 则运行定义在 `Room` 原型里的 lab 集群策划。
- [10t 一次] 如果 lab 发现自己在 `Room.memory.lab.outLab` 里，就会把自己存储的数量写到对应的内存项里。

# 模块化

lab 集群的子模块包括：**目标指定**、**数量检查**、**工作模块** 和 **物流任务发布**。

**目标指定**

目标是指提前安排好的工作目标中的一个。lab 会在上一个目标完成之后开始进行新的目标挑选，当满足下面条件后将会将其确定为自己接下来要制作的目标：

- 该目标化合物在 terminal 中的储量不达标
- 该目标化合物所需要的基础原料都已经存在于 terminal 里（保证不会因原料不足而暂停合成，由基本资源检查模块负责）
- storage 中的能量大于 100k（暂定）

目前的工作目标见 `setting.ts` 中的 `labTarget` 。

注：基础矿物不属于 lab 集群的目标，关于基础矿物的收集应有其他模块（例如资源共享协议或 terminal 监控模块）负责，lab 模块在发现对应基础矿物缺失后只会跳过该化合物的合成。

**数量检查**

该模块会接受其他模块传来的目标产物，然后查阅 terminal.store 中的底物是否足够，并返回可以合成的目标产物的数量（为 0 代表无法合成）

注：由于游戏中并没有给出“从目标化合物 > 底物”的常量列表，所以需要额外手动建立一个。

**工作模块**

工作模块是 lab 自动化合成的核心模块，它会接受当前任务目标、等待所需资源到位（由物流任务发布负责，manager 角色填充），然后调用指定的 lab 建筑运行 `Lab.runReaction`，直到所有的底物都被消耗，当底物消耗完或者自身容量不足时将会通知物流任务发布模块将生成好的产物移送至 terminal。

**物流任务发布**

该模块是 lab 集群和外部进行资源交换的纽带。任务规划器会通知该模块进行资源移入任务，而当前任务结束后会通知该模块进行产物资源移出。

# 流程

- `state` 检查，并执行下列阶段之一

- `getTarget` 阶段
    - 检查 `targetIndex`，没有则新建
    - 通过 `targetIndex` 获取目标
    - 调用数量检查模块，查看 tarminal 中的资源是否可以合成当前目标
        - 可以合成，将 `state` 置为 `getResource`，将资源检查模块返回值设置到 `targetAmount` (注意不能超过两千)，return
        - 不可以合成，将 `targetIndex` 置为下一个，return

- `getResource` 阶段
    - 检查当前房间物流队列中有没有任务？
        - 有任务，直接 return
    - 两个输入 lab 是否有足够数量的底物？
        - 有，将 `state` 置为 `working`，return 
    - 通过 `targetAmount` 检查 terminal 终端中的底物数量是否足够
        - 足够，发布物流任务，return
    - 移除 `targetAmount`, `targetIndex` + 1 或 = 0，将 `state` 置为 `getTarget`，return

- `working` 阶段
    - outLab 是否冷却完成
        - 否，return
    - 遍历所有 outLab，与 inLab 一起进行反应
        - 检查返回值
            - 返回资源不足，将 `state` 置为 `putResource`，return
            - 返回冷却中，将冷却时间保存至内存，return
    
- `putResource` 阶段
    - 物流队列中是否已经有任务？
        - 有任务，等待，return
    - 遍历 `outLab` 列表，检查是否都已经转移出去了
        - 都为空，将 `state` 置为 `getTarget`，移除 `targetAmount`，`targetIndex` + 1 或 = 0，return
    - 根据 `targetIndex` 找到对应产物，发布移出资源的物流任务

**初始化方法**

- 检查是否有 `lab1` 和 `lab2` 的旗帜
    - 没有，显示”请新建对应旗帜“，return
- 初始化 `Room.memory.lab`
- `Room.find` 查找旗帜，如果坐标等于旗帜的坐标，则放入 `Room.memory.lab.inLab`，否则放入 `Room.memory.lab.outLab`。
- 移除对应旗帜，返回”初始化成功“

**数量检查模块**

- 接受目标产物类型
- 在 setting.ts 中查找其底物
- 从 terminal 中取出对应的数量，并检查其是否为 null
    - 为 null 直接 return 0
- 两者取最小值，并找到能被5整除的最大数值（因为化合物反应是1次5个，这么做是为了防止 inLab 中残留底物）
- 返回该数值

**物流任务发布**

lab 的物流任务一共包含三个任务，in(底物填充)、out(产物移出)、getEnergy(获取能量)，具体内容参加”房间物流设计案“。

# 持久化

**Room**:

```js
{  
    // 本 tick 是否已经运行了 lab 策划，lab 会先检查该字段，如果为 false 则执行策划，然后将其置为 true
    _hasRunLab: false
}
```

**Room.memory.lab**:

```js
{
    // 当前 lab 模块所处的阶段，包括：getTarget(目标指定)，getResource(底物移入)，working(生成中)，putResource(产物移出)
    // 这几种状态会按顺序依次循环
    state: 'getTarget', 
    // 当前的目标索引，由目标指定模块在 getTarget 阶段修改
    targetIndex: 2,
    // 要合成的目标产物数量，由目标指定模块在 getTarget 阶段修改
    targetAmount: 500,
    // 集群中的底物存放 lab，在初始化阶段指定
    inLab: [ 
        '5d9bdd4b1acf0f000174aa4a',
        '5d9bdd4b1acf0f000174aa4b' 
    ],
    // 集群中的产物存放 lab，在初始化阶段指定
    // 其键为 lab id，值为其中存放的资源数量
    outLab: {
        '5d9bdd4b1acf0f000174aa4c': 100,
        '5d9bdd4b1acf0f000174aa4d': 300,
        '5d9bdd4b1acf0f000174aa4e': 300,
        '5d9bdd4b1acf0f000174aa4f': 100,
        '5d9bdd4b1acf0f000174aa4g': 200,
        '5d9bdd4b1acf0f000174aa51': 300,
        '5d9bdd4b1acf0f000174aa52': 100,
        '5d9bdd4b1acf0f000174aa53': 100
    }
}
```