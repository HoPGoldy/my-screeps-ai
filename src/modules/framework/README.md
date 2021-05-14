# 核心框架

一个轻量级 screeps 框架，只有不到三百行代码。包含生命周期回调、原型拓展、异常隔离功能。整个框架的核心 api 只有两个：`on` 和 `mount`。

## 如何使用

这个示例说明了如何最小化的使用该框架：首先引入框架、生成实例、使用 `on` 方法添加 `tickStart` 回调，并在其中完成自己的逻辑。最后执行 `run` 方法运行应用。

```js
import App from 'modules/framework'

const app = new App()

app.on({
    tickStart: () => {
        // 你的代码写在这里 ...
    }
})

export const loop = () => app.run()
```

`tickStart` 回调里的代码会在每个 tick 开始时被调用，这么做的效果和直接在 loop 里添加逻辑的写法完全一致，当然，没人会这么写，下面来了解一下更加完善的写法：

## 功能1：生命周期回调

除了 `tickStart` 之外，框架还提供了其他四种生命周期，如下：

```js
app.on({
    /**
     * 玩家放下第一个 spawn 时触发，整个应用只会执行一次
     * 会在所有 reset 回调完成后执行（防止出现有依赖还没准备好的问题出现）
     */
    born: () => console.log('欢迎来到 screeps!'),
    /**
     * 全局重置时触发
     */
    reset: () => console.log('全局重置了!'),
    /**
     * 在每个 tick 开始时触发
     */
    tickStart: () => console.log('tick 开始!'),
    /**
     * 在每个 tick 完成了所有单位的 onWork 任务后触发
     */
    afterWork: () => console.log('tick 进行中!'),
    /**
     * 在所有 afterWork 回调执行完成后触发
     */
    tickEnd: () => console.log('tick 结束!')
})
```

其中 `afterWork` 阶段的作用可能不太明朗，我们就先将其理解成 `tickStart` 之后会触发的一个阶段就好。

`on` 方法是框架的两个核心 api 之一。**它可以被调用无限次，每次调用时注册的回调都会被储存起来，然后按照顺序依次触发**，你可以这么写：

```js
const app = new App()

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

app.run()
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

框架并没有限制必须在 `run` 方法执行前注册完所有的回调，你可以在任意位置注册/取消回调，例如可以通过如下方法完成一个显示 cpu 消耗的简单功能：

```js
Object.defineProperty(global, 'cost', {
    get() {
        if (!global.showCost) {
            global.showCost = app.on({
                tickStart: () => console.log('开始阶段消耗', Game.cpu.getUsed()),
                afterWork: () => console.log('工作阶段消耗', Game.cpu.getUsed()),
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

## 功能2：原型拓展

框架支持通过 `mount` 方法（*这是框架第二个核心 api*）将你自定义的对象属性挂载到游戏对象上，如下：

```js
// 创建一个新的 creep 拓展
// 注意下面的 extends Creep 是不必要的，这里只是为了提供更好的类型补全，不写也可以正常使用
class MyCreep extends Creep {
    get word() { return 'hello world!' }

    sayHi() {
        console.log(this.name, this.word)
    }
}

// 将拓展挂载到 Creep 原型上
app.mount(Creep, MyCreep)
```

然后在控制台执行：

```bash
# 先要有还活着的 creep
< Object.values(Game.creeps)[0].sayHi()
# 你会看到你的 creep 高呼着自己的名字向世界问好
> creepA hello world!
```

这样你的自定义拓展就已经挂载到所有 creep 上了。

## 原型上的入口方法

先看一个例子：

```js
// 创建 Room 的拓展，并指定 onWork 方法
class MyRoom {
    onWork() {
        console.log(this.name, '报道!')
    }
}

// 挂载拓展
app.mount(Room, MyRoom)

export const loop = () => app.run()
```

然后什么都不用做，就可以看到控制台在一遍遍的输出你每个有视野房间的名字。

```bash
sim 报道!
sim 报道!
sim 报道!
...
```

当框架发现一个游戏对象上包含入口方法时，将会在每个 tick 的 `tickStart` 阶段执行完成后调用它。我们约定，**`onWork` 方法即为该游戏对象的入口方法**。框架会自动执行 `Game.rooms`、`Game.structures`、`Game.creeps` 和 `Game.powerCreeps` 上的入口方法。如果对应的原型上没有定义 `onWork` 方法的话，框架将会直接跳过。

顺带一提，还记得在刚才“生命周期回调”小节里提到的 `afterWork` 钩子么，它将会在所有的 onWork 方法执行后触发。

## 在实例化时挂载拓展

由于大多数情况下，每次全局重置都只会挂载一次原型拓展，所以框架允许在实例化时通过传入数组的形式来直接进行挂载，如下：

```js
// 要挂载的拓展数组，其元素为一个元组，格式为 [ 目标类，拓展类 ]
const mountList = [
    [ Room, RoomExtension ],
    [ Creep, CreepExtension ],
    // ...
]

// 直接挂载所有的原型拓展
// 等同于对数组里每个挂载对都执行了一次 mount 方法
const app = new App({ mountList })
```

## 功能3：异常隔离

框架会自动把你代码抛出的错误限制在其能控制的最小范围内，从而避免一个错误就导致整个应用崩溃，例如：

```js
const app = new App()

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

class MyCreep extends Creep {
    onWork() {
        // 名为 creepB 的 creep 会一直报错
        if (this.name === 'creepB') {
            throw new Error(`${this.name} 报错！！！`)
        }
        // 其他的 creep 的逻辑
        else console.log(this.name, '正常工作')
    }
}

// 将拓展挂载到 Creep 原型上
app.mount(Creep, MyCreep)

export const loop = () => app.run()
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

## 自定义异常捕获

默认的异常捕获如下：

```js
// 这个 next 就是实际的生命周期回调和游戏对象的入口函数
catcher = next => {
    try {
        next()
    }
    catch (e) {
        console.log(`<span style="color:#ef9a9a">${e}</sapn>`)
        Game.notify(e)
    }
}
```

你可以通过设置 `catcher` 属性的方式使用自定义的异常捕获，如下。**注意！其中的 next 方法必须执行！** 不然会导致框架无法正常使用：

```js
app.catcher = next => {
    try {
        next()
    }
    catch (e) {
        console.log('我的代码不可能有 bug')
    }
}
```

你也可以通过如下方式接入 [screeps-typescript-starter](https://github.com/screepers/screeps-typescript-starter) 中的 [ErrorMapper](https://github.com/screepers/screeps-typescript-starter/blob/master/src/utils/ErrorMapper.ts)：

```js
app.catcher = next => ErrorMapper.wrapLoop(next)()
```

*实际上，由于 ErrorMapper 会返回一个新的函数来包裹对应的逻辑，在本框架里直接使用会导致出现一丢丢的性能损耗，如果你介意的话，可以按照 [这里](https://github.com/HoPGoldy/my-screeps-ai/blob/dev/src/modules/errorMapper.ts#L77) 的做法进行修改。*

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