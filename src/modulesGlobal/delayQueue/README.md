# 延迟任务模块

某些任务需要在未来执行，例如一万 tick 后检查下 storage 能量还有多少，或者 mineral 采空之后需要等矿恢复好后再采集，本模块就是用于处理这些“异步”需求。

但是 screeps 不支持在 Memory 中存放函数，所以如果发布延迟任务的同时提供回调函数的话，等到任务执行时，回调函数已经凉透了，所以需要一套新的方案支持回调函数。

## 功能实现

本模块的操作流程：在全局重置时注册回调 > 得到延迟任务发布函数 > 调用发布函数发布延迟任务

具体操作如下：

## 1、构建模块

调用模块创建后会导出两个方法，`manageDelayTask` 需要每 tick 调用，不需要参数，用于管理延迟任务的触发。`withDelayCallback` 则提供给其他模块，用于 **注册延迟任务回调**。

```js
import { createDelayQueue } from '@/modulesGlobal/delayQueue'

const { manageDelayTask, withDelayCallback } = createDelayQueue({ /** ... */ })
```

## 2、注册回调

引入 `withDelayCallback` 函数，传入回调唯一类型和要触发的回调：

```js
import { withDelayCallback } from '...'

const addDelayTask = withDelayCallback('uniqueTaskType', (data) => {
    console.log('延迟任务触发！任务数据：', JSON.stringify(data))
})
```

## 3、发布延迟任务

上一步中 `withDelayCallback` 返回的是一个函数，调用这个函数，并传入 **任务触发时的数据** 和 **多少 tick 之后触发** 即可：

```js
const data = { roomName: 'W1N1' }
addDelayTask(data, 100)
```

上述方法调用后，将会在一百 tick 之后在控制台输出：

```bash
延迟任务触发！任务数据："{ roomName: 'W1N1' }"
```

## 其他

延迟任务的 data 可以是任何 kv 对象。如果使用 ts，可以在 withDelayCallback 的 callback 里指定 data 的类型。这样在发布任务的时候就会自动对传入的 data 类型进行校验。

添加延迟任务时会以要触发的 tick 作为键，其值是一个数组存放了对应 tick 要执行的任务，在一般情况下，要执行的任务数组都会被序列化成字符串，只会在需要执行时才被解析。所以日常的 cpu 消耗低到可以忽略不计。