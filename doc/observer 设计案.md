# Observer设计案

## 目标

检测指定房间的deposit和powerBank并自动插旗

## 流程

- 如果初始化（初始化会设置内存，重置listNum
- 如果没有暂停
- 如果isChecked是false
  - 如果Game.time % 5 !=0 return
  - 进入查房模式
  - 获取config里的observer房间
  - 根据listNum进行查房
  - 更新listNum
- 如果isChecked是true
  - 进入搜资源模式
  - 获取上一tick查询的房间
  - 查找deposit和 powerBank并插旗 （todo：自定义旗帜名称