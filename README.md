# zoon-battle

[CryptoZoon](https://app.cryptozoon.io/) 自动打怪工具

Automatic monster fighting tool for [CryptoZoon](https://app.cryptozoon.io/)

## 风险和免责

本工具为社区开发，与CryptoZoon项目方无关。

本工具可无偿使用，使用过程中的所有收益和亏损均由用户自己承担。

本工具代码和第三方包均为开源产品，请认真查阅代码，并自行承担使用过程中的一切风险。

## 教程

Windows详细部署教程【待完善】

MacOS/Linux详细部署教程【待完善】


## 环境准备

node.js 10+


## 安装

```
# clone代码
git clone https://github.com/MaoYanFi/zoon-battle.git

# 进入目录
cd zoon-battle

# 安装依赖包
npm install

```


## 配置

```

# 根据模板创建.env文件
cp .env.example .env

# 根据.env文件内注释配置.env文件

```


## 直接运行

```

# 直接运行程序
node app.js

```


## pm2守护进程运行

```

# 安装pm2
npm install -g pm2

# 启动进程
pm2 start app.js --name zoon-battle

# 查看进程
pm2 ls

# 查看进程日志
pm2 log zoon-battle

# 重启进程
pm2 restart zoon-battle

# 停止进程
pm2 stop zoon-battle

# 删除进程
pm2 delete zoon-battle

```

## 猫眼社区社群答疑

加微信（WeChat）进群：  shuaizhen668

## 捐赠


0x66be3bF47bD7f08D812aA6aA34724aCc84642DBa