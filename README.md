# my-screeps-ai

适用于游戏《[Screeps](https://screeps.com/a/#!/map)》的半自动 ai 项目。

注意，本项目尚未完成，后续可能会进行大范围的代码更改，你可以通过本项目了解 Screeps 相关的操作以及如何将 grunt 和 TypeScript 应用在 Screeps 里（本项目包含完整的中文注释），但是请尊重自己和他人的游戏体验，不要将本项目直接部署在官方服务器上。

## 准备

**安装依赖**

```bash
# nodejs >= 10.13.0
npm install
```

**添加密钥**

在根目录下新建 `secret.js` 文件，并填入以下内容，记得修改邮箱、密码及要复制到的文件夹路径。
*`copyPath`是用于向本地 screeps 代码文件夹复制代码，没有需要可以填空字符串。*

```js
module.exports = {
    email: 'YOUR_EMAIL',
    password: 'YOUR_PASSWORD',
    copyPath: 'YOUR_TARGET_PATH'
}
```

## 使用

启动代码自动提交

```
npm start
```

向 copyPath 复制代码

```
npm run local
```

启动开发环境 (只会执行 ts 编译, 不提交代码)

```
npm run dev
```

拉取线上代码 (只能拉取 `.js` 文件)

```
npm run pull
```

## 设计

访问 [/doc](https://github.com/HoPGoldy/my-screeps-ai/tree/master/doc) 来查看设计细节。

## 统计代码行数及注释率

```
node count.js ./src
```