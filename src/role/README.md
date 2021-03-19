# Creep 角色实现

在本项目中所有的 creep 执行逻辑都位于本文件夹中。共分为三大类，分别是：

- **base**：维持房间运维的基础角色，例如 source 采集，搬运工等
- **remote**：外出房间执行任务的远程角色，例如占领新房，过道资源采集等
- **war**：战斗及治疗单位

其中，`bodyConfigs.ts` 记录了不同角色在不同 RCL 时的身体配置项。

# creep 生命周期

本小节介绍该项目中 creep 的生命周期：

## 孵化阶段

spawn 在孵化前会从孵化任务中读取配置项并初始化 creep。

## 准备阶段（prepare）

【可选】孵化完成后 creep 将进入准备阶段，例如抵达指定位置或进行强化等。若没有准备阶段则直接进入工作阶段。

## 工作阶段（source / target）

准备完成后 creep 将根据自己内存中的配置和角色进行工作，并根据 source / target 方法的返回值切换下个 tick 要执行的工作，其中：

- source 阶段主要用于获取工作所需的资源，该阶段返回 true 将在下个 tick 切换为 target 阶段，该阶段可以为空，为空则一直执行 target 阶段。
- target 阶段主要用于执行工作，该阶段返回 true 将在下个 tick 切换为 source 阶段。

工作阶段一直持续到 creep 死亡。

## 回收阶段（isNeed）

死亡后，creep 数量控制器会发现死去的 creep，并访问 isNeed 方法确定该 creep 是否需要继续孵化。若需要重新孵化，则使用 creep.memroy.data 重新生成孵化任务，进入孵化阶段。若没有 isNeed 方法则默认持续孵化。