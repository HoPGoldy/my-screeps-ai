# 房间模块

本文件夹里包含与房间有关的工作模块。

## RoomAccessor

房间访问器，该类提供了对房间和模块内存的访问能力，几乎所有的房间模块都继承自这个类。

## creep 任务模块

该目录下共有四个任务相关的模块：`taskBase`、`taskTransport`、`taskWork` 以及 `taskCenter`。

其中，taskTransport 是房间物流任务模块、taskWork 是房间工作任务模块，由于这两者的任务管理类似，所以抽象出来共同的基类 taskBase。

而 taskCenter 是中央物流模块，和 taskBase 没有关系。