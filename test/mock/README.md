# 单元测试 MOCK 工具

由于单测执行环境里没有游戏里 `Game`、`Memory` 之类的对象，所以这里提供了一些用于模拟的类以及一个用于刷新 global 环境的方法（index.ts 中）。

*本文件夹中的 Mock 类并不完善，需要根据测试需求逐渐完善。*

## 相关

- [sinon 官方文档](https://sinonjs.org/releases/v9.2.4/)
- [阮一峰 - Mocha 教程](http://www.ruanyifeng.com/blog/2015/12/a-mocha-tutorial-of-examples.html)