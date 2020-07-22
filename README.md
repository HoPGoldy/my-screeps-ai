# my-screeps-ai

适用于游戏《[Screeps](https://screeps.com/a/#!/map)》的半自动 ai 项目。

注意，本项目尚未完成，后续可能会进行大范围的代码更改，你可以通过本项目了解 Screeps 相关的操作以及如何将 rollup 和 TypeScript 应用在 Screeps 里（本项目包含完整的中文注释），但是请尊重自己和他人的游戏体验，不要将本项目直接部署在官方服务器上。

## 准备

**安装依赖**

```bash
# nodejs >= 10.13.0
npm install
```

**添加密钥**

在根目录下新建 `.secret.json` 文件，并填入以下内容，注意填写自己的 token。

```js
{
    "main": {
        "token": "YOUR_TOKEN_HERE",
        "protocol": "https",
        "hostname": "screeps.com",
        "port": 443,
        "path": "/",
        "branch": "default"
    }
}
```

## 使用

启动代码自动提交

```
npm start
```

启动开发环境 (只会执行 ts 编译, 不提交代码)

```
npm run build
```

## 设计

访问 [/doc](https://github.com/HoPGoldy/my-screeps-ai/tree/master/doc) 来查看设计细节。

## 其他

本项目的构建流程参考了 [screeps-typescript-starter
](https://github.com/screepers/screeps-typescript-starter) 并加以简化，你可以点击 [这里](https://screepers.gitbook.io/screeps-typescript-starter/) 来了解更多关于该模板项目的信息。