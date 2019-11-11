# my-screeps-ai

适用于游戏《[screeps](https://screeps.com/a/#!/map)》的半自动 ai

## 准备

**安装依赖**

```
npm install
```

**添加密钥**

在根目录下新建 `secret.js` 文件，并填入以下内容，记得修改邮箱、密码及要复制到的文件夹路径。
*`copyPath`是用于向本地文件夹复制代码，没有需要可以填空字符串。*

```js
module.exports = {
    email: 'YOUR_EMAIL',
    password: 'YOUR_PASSWORD',
    copyPath: 'YOUR_TARGET_PATH'
}
```

**完成配置项**

打开 `src/` 目录，将 `config.template.ts` 重命名为 `config.ts`。

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