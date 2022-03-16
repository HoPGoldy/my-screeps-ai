# 角色控制模块

本模块是一个基础模块，用于提供对 creep 的控制能力。

注意，这个对 creep 的控制是局部性的，不会直接遍历 Game.creeps 执行操作，而是需要外界调用方法告诉它可以控制哪些 creep。

## 设计

在本项目的设计中，模块是一切的基础，而 creep 则是模块的延申。*例如物流任务模块需要 creep 来运输资源，observer 模块需要 creep 来采集过道资源。*所以 creep 一定有其所属的模块。

因此，creep 的控制权应该交由具体的模块负责，而不是有一个“全局性”的 creep 控制器。

## 添加单位（addUnit）与注册单位（registerUnit）

“添加”操作需要传入一个 creep 实例以及其初始内存，之后本模块将会对其进行控制。而“注册”操作需要传入一个 creep 名称和初始内存，告诉本模块 **将会** 有一个单位加入进来。

为什么要多此一举？

核心原因是 **角色控制模块的内存不一定在 creep.memory 里。** 发布一个新 creep 的流程一般都是向孵化模块发送一个孵化任务，可以通过传递额外的参数来给新孵化的 creep 设置内存字段。但是注意！孵化模块会将指定的内存数据存放在 creep.memory 里，并在孵化完成后通过回调拉起对应的角色控制模块。此时我们还需要额外的一步来把数据从 creep.memory 转移到角色控制模块的内存对象里。即：

creep 死亡 ==> 发送孵化任务，并指定内存数据 ==> 内存数据放在 creep.memory ==> 角色控制模块把数据从 creep.memory 复制到自己的内存里

这么搞实际上就是让数据转了一个圈又回来了（从角色模块到孵化模块，再到角色模块），很弱智，而且孵化模块并不关心你的额外内存的类型，也就是说，这一套操作背后时没有类型安全的支持的。你需要额外的心智来关心内存有没有正确的传递给下一代爬。

那么，我们为什么不在发布孵化爬任务的时候直接把下一代的内存告诉角色模块呢？数据不需要绕一圈了，内存字段的类型也安全了。就相当于角色模块提前拿到了爬的内存，接下来就等爬孵化好就可以直接把内存数据给他了。

所以，（提前）注册单位的 api 就诞生了。