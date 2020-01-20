# Observer 设计案（修改中）

## 目标

检测指定房间的 deposit 和 powerBank 并自动插旗

## 核心规则

- observer 以房间为单位，默认不启用
- observer 开放 api，使得其他模块可以访问 ob 找到的资源

## CLI 设计

**添加监控房间**

```ts
Observer.add(roomName, ...)
```

**移除监控房间**

```ts
Observer.remove(roomName, ...)
```

**暂停**

```ts
Observer.off()
```

**重启**

```ts
Observer.on()
```

**清空监控房间**

```ts
Observer.clear()
```

**显示所有监控的房间**

```ts
Observer.show()
```

**后续开发：修改查找上限**

observer 在找到某种资源多少个后就不再继续查找，默认为 `1`

```ts
Observer.setLimit(resourceType: 'powerBank' | 'deposit', limit: number)
```

## API 设计

**新增资源（私有）**

在 observer 找到新资源后会通过这个方法进行保存

```ts
Observer.addResource(resourceType: 'powerBank' | 'deposit', flagName: string): void
```

**获取资源（公共）**

提供给其他模块使用，获取找到的某种资源

返回插在资源上的 flag 名称

```ts
Observer.getResource(resourceType: 'powerBank' | 'deposit'): string
```

**资源已处置（公共）**

其他模块（采集 creep）在完成任务后会通过 observer 移除该旗帜

```ts
Observer.ResourceClear(flagName: string)
```

## 流程

- 如果房间存在对应内存的话（玩家在 `Obsrever.add` 时会新建）
- 如果没有暂停
- 如果不存在 `checkRoomName` 字段
  - 定期执行
  - 获取要查看的房间
  - ob 该房间
    - 如果 ob 成功则缓存其名称
  - 更新索引
- 如果存在 `checkRoomName` 字段（已经有 ob 过的房间等待查看了）
  - 获取上一tick查询的房间
  - 查找 deposit 和 powerBank 并插旗（旗帜名称 "资源类型 + 房间名 + 当前时间"）
  - 更新获取到的资源
  - 移除 `checkRoomName`

# 持久化

**Room.memory**

```ts
observer: {
    // 上个 tick 已经 ob 过的房间名
    checkRoomName: string
    // 遍历 watchRooms 所使用的索引
    watchIndex: number
    // 监听的房间列表
    watchRooms: string[]
    // 获取到的资源信息
    resourceFlags: {
        [OBSERVER_RESOURCES.POWER_BANK]: string[]
        [OBSERVER_RESOURCES.DEPOSIT]: string[]
    }
    pause: boolean
}
```

**setting**

```ts
// observer 可以获取到哪些资源
OBSERVER_RESOURCES: {
    POWER_BANK: 'powerBank',
    DEPOSIT: 'deposit'
}
```