# 核心框架

一个轻量级 screeps 框架，只有一百多代码。包含生命周期回调、异常隔离、Memory 缓存功能。

## 如何使用

这个示例说明了如何最小化的使用该框架：首先引入框架、生成实例、使用 `on` 方法添加 `tickStart` 回调，并在其中完成自己的逻辑。最后执行 `run` 方法运行应用。

```js
import { createApp } from 'modules/framework'

const app = createApp()

app.on({
    tickStart: () => {
        // 你的代码写在这里 ...
    }
})

export const loop = app.run
```

`tickStart` 回调里的代码会在每个 tick 开始时被调用，这么做的效果和直接在 loop 里添加逻辑的写法完全一致，当然，没人会这么写，下面来了解一下更加完善的写法：

## 功能1：生命周期回调

包括 `tickStart` 在内，框架共提供了三种生命周期，如下：

```js
app.on({
    /**
     * 框架第一次运行时触发，整个应用只会执行一次
     */
    born: () => console.log('欢迎来到 screeps!'),
    /**
     * 在每个 tick 开始时触发
     */
    tickStart: () => console.log('tick 开始!'),
    /**
     * 在所有游戏单位工作执行完成后触发
     */
    tickEnd: () => console.log('tick 结束!')
})
```

`on` 方法是框架的核心 api。**它可以被调用无限次，每次调用时注册的回调都会被储存起来，然后按照顺序依次触发**，你可以这么写：

```js
const app = createApp()

// 执行全局工作
app.on({
    tickStart: () => console.log('--- tick 开始 ---')
})

// 执行模块 A 的工作
app.on({
    tickStart: () => console.log('模块 A 工作'),
    tickEnd: () => console.log('模块 A 保存')
})

// 执行模块 B 的工作
app.on({
    tickStart: () => console.log('模块 B 工作'),
    tickEnd: () => console.log('模块 B 保存')
})

export const loop = app.run
```

然后就可以看到以下输出：

```
--- tick 开始 ---
模块 A 工作
模块 B 工作
模块 A 保存
模块 B 保存
```

通过使用多个 `on` 对不同模块的逻辑进行分组，你可以提高模块的内聚性。从而避免所有逻辑都平铺在 loop 里形成意大利面代码。你可以在 [这里](https://github.com/HoPGoldy/my-screeps-ai/blob/dev/src/main.ts#L18) 看到本框架在组织众多模块时的语义化表现。

在注册回调后，你也可以通过 `close` 方法将回调移除，如下：

```js
// on 方法将会返回本组回调的唯一索引
const moduleIndex = app.on({
    tickStart: () => console.log('模块执行'),
    tickEnd: () => console.log('模块保存')
})

// 将索引传递给 close 方法，其对应的回调将会被移除
app.close(moduleIndex)
```

## 热插拔

框架并 **没有** 限制必须在 `run` 方法执行前注册完所有的回调，你可以在任意位置注册/取消回调，例如可以通过如下方法完成一个显示 cpu 消耗的简单功能：

```js
Object.defineProperty(global, 'cost', {
    get() {
        if (!global.showCost) {
            global.showCost = app.on({
                tickStart: () => console.log('开始阶段消耗', Game.cpu.getUsed()),
                tickEnd: () => console.log('结束阶段消耗', Game.cpu.getUsed()),
            })
        }
        else {
            app.close(global.showCost)
            delete global.showCost
        }
    }
})
```

当你在控制台输入 cost 后，将会每个 tick 打印不同阶段的 cpu 消耗，再次输入 cost 或者等到全局重置时，消耗显示将会被自动关闭。

## 功能2：设置运行器

框架支持以下三个运行器：

- `roomRunner`: 设置房间运行器
- `crepRunner`：设置 creep 运行器
- `powercreepRunner`：设置 pc 运行器

可以在初始化 app 时设置运行器：

```js
const roomRunner = room => {
    // 每个有视野的房间都会执行一遍这个函数
}
const crepRunner = creep => {
    // 将对所有的 creep 运行该函数
}
const powerCreepRunner = creep => {
    // 将对所有 pc 运行该函数（包括未出生的 pc）
}

// 在创建 app 时设置运行器
const app = createApp({ roomRunner, crepRunner, powerCreepRunner })
```

注意，这三个运行器非必填项，当你不填时，框架会直接跳过对应的游戏对象遍历。

## 功能3：异常隔离

框架会自动把你代码抛出的错误限制在其能控制的最小范围内，从而避免一个错误就导致整个应用崩溃，例如：

```js
const creepRunner = creep => {
    // 名为 creepB 的 creep 会一直报错
    if (this.name === 'creepB') {
        throw new Error(`${this.name} 报错！！！`)
    }
    // 其他的 creep 的逻辑
    else console.log(this.name, '正常工作')
}

const app = createApp({ creepRunner })

// 注册一个正常的模块
app.on({
    tickStart: () => console.log('A 执行'),
    tickEnd: () => console.log('A 保存')
})

// 这个模块的 tickStart 阶段会报错
app.on({
    tickStart: () => { throw new Error('B 报错！！！') },
    tickEnd: () => console.log('B 保存')
})

export const loop = app.run
```

然后你就可以在控制台看到：

```diff
A 执行
- Error: B 报错！！！
creepA 正常工作
- Error: creepB 报错！！！
creepC 正常工作
A 保存
B 保存
```

可以看到，代码执行抛出的异常被限制在其所在的方法中，完全不会影响到其他模块或者单位的正常执行。

*示例中只使用了 `creepRunner`，实际上 `roomRunner` 和 `powercreepRunner` 也有相同的异常隔离效果。*

## 功能4：内存缓存

如果你对 screeps 的 [Memory 机制](https://screeps-cn.gitee.io/global-objects.html#%E5%BA%8F%E5%88%97%E5%8C%96) 比较熟悉的话，那么应该知道内存在每 Tick 开始时会进行 JSON 反序列化，在内存使用量较大时会消耗不少的 CPU。

而本框架内建了一套内存缓存机制，该功能默认启用且无需配置，只要使用了本框架就不再产生 Memory 初始化消耗。

当然，你也可以通过修改 `app.memoryCacher` 的方式来使用你的内存缓存功能，用法和上文中的 catcher 完全一致，你也可以将其设置空值来关闭内存缓存：

```ts
// 自定义内存缓存
app.memoryCacher = next => {
    console.log('我通过意念来缓存 Memory')
    // 必须执行！否则将无法运行
    next()
}

// 关闭内存缓存
app.memoryCacher = undefined
```

*你可以在 [这里](https://github.com/HoPGoldy/my-screeps-ai/blob/dev/src/modules/framework/index.ts#L55) 找到默认的内存缓存实现。*

## bot 名称

你可以在 new App 时给其分配一个名字，然后通过其 name 属性访问：

```js
const app = new App({ name: '大刺蛇 yyds' })
console.log(app.name)
// > 大刺蛇 yyds
```

*实际上，这个名字还将被写入 Memory，并将其作为是否执行过 born 生命周期阶段的标识。*