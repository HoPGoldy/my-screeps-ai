# my-screeps-ai

[![](https://img.shields.io/badge/Room-12-success.svg)](https://screeps.com/a/#!/profile/HoPGoldy) ![](https://img.shields.io/badge/avgCPU-15-yellow)

适用于游戏 [Screeps](https://screeps.com/a/#!/map) 的半自动 ai 项目。

注意，本项目尚未完成，后续可能会进行大范围的代码更改，你可以通过本项目了解 Screeps 相关的操作以及如何将 rollup 和 TypeScript 应用在 Screeps 里（本项目包含完整的中文注释），但是请尊重自己和他人的游戏体验，不要将本项目直接部署在官方服务器上。

## 准备

**安装依赖**

```bash
# nodejs >= 10.13.0
npm install
```

**添加密钥**

在根目录下新建 `.secret.json` 文件，并填入以下内容:

```js
{
    "main": {
        "token": "YOUR_TOKEN_HERE",
        "protocol": "https",
        "hostname": "screeps.com",
        "port": 443,
        "path": "/",
        "branch": "default"
    },
    "local": {
        "copyPath": "../screeps-dist"
    }
}
```

## 使用

向服务器自动提交代码（需要填写 `.secret.json` 中 `main.token` 字段）

```
npm start
```

向本地目录自动提交代码（需要填写 `.secret.json` 中 `local.copyPath` 字段）

```
npm run local
```

进行代码构建（不会上传代码）

```
npm run build
```

进行测试

```bash
# 执行单元测试
npm run test-unit
# 执行单元测试并生成覆盖率报告（coverage/index.html）
npm run test-cover
# 执行功能测试
npm run test-behavior
# 执行集成测试
npm run test-integration
```

## 设计

访问 [/doc](https://github.com/HoPGoldy/my-screeps-ai/tree/master/doc) 来查看设计细节。

## 其他

本项目的构建流程参考了 [screeps-typescript-starter
](https://github.com/screepers/screeps-typescript-starter) 并加以简化，你可以点击 [这里](https://screepers.gitbook.io/screeps-typescript-starter/) 来了解更多关于该模板项目的信息。