# my-screeps-ai

适用于游戏《[screeps](https://screeps.com/a/#!/map)》的半自动 ai

## 准备

**安装依赖**

```
npm install
```

**添加密钥**

在根目录下新建 `secret.js` 文件，并填入以下内容，记得修改邮箱、密码及要复制到的文件夹路径。

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

拉取线上代码

```
npm run pull
```