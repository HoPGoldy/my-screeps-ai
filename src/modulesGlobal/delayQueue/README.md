# 延迟任务模块

某些任务需要在未来执行，例如一万 tick 后检查下 storage 能量还有多少，或者 mineral 采空之后需要等矿恢复好后再采集，本模块就是用于处理这些需求。

但是 screeps 不支持在 Memory 中存放函数，所以如果发布延迟任务的同时提供回调函数的话，等到任务执行时，回调函数已经凉透了。

本模块采用如下方式来触发回调函数：

## 注册回调

第一步，在全局重置时调用指定方法注册回调函数，注册时需提供 **回调名称** 和 **回调函数**。

```js
import { delayQueue } from '@/modulesGlobal/delayQueue'

delayQueue.addDelayCallback('回调名称', () => {
    // 回调任务
})
```

## 发布任务

第二步，在需要的时候发布延迟任务，这里会接受三个参数，分别是要触发的回调名称（上面注册的），回调触发时接受的参数，任务在多久之后触发

```js
import { delayQueue } from '@/modulesGlobal/delayQueue'

delayQueue.addDelayTask('回调名称', { roomName: 'W1N1' }, 100)
```

```js
注册回调(回调名称, 回调函数)
添加延迟任务(回调名称，回调触发时的数据)
```

---

并且，在 loop 循环里还需要每 tick 调用 `delayQueue.manageDelayTask` 来管理并触发这些延迟任务。

添加延迟任务时会以要触发的 tick 作为键，其值是一个数组存放了对应 tick 要执行的任务，所以在日常检查时的 cpu 消耗低到可以忽略不计。