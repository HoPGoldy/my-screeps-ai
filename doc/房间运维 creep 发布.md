# 房间运维 creep 发布

本文档收录项目中用于房间运维的 creep 的发布计划。

## RCL 1

- 发布 harvester + upgrader
- [可选] 可手动发布额外的 harvester + upgader

## storage 建成

- 发布额外的 harvester * 2，并将所有的 harvester 的存储目标设置为 storage（一方面提高 extension 填充效率，一方面给 storage 填充基本能量）

## RCL 5

- 发布 transfer（storage 解锁后其中的能量还不是很足够，所以选择 RCL 5 时发布本角色）

## centerLink 注册

- 发布 centerTransfer

## sourceLink 注册

- 修改对应 source 的 harvester 为 collector，存储目标指向对应的 sourceLink
- 检查是否有其他目标为本 source 的 creep。有则移除

## terminal 建成

- 有 miner 的话将其存储目标调整为自己
- 已经有房间 8 级的话就发布 remoteUpgrader

## Extractor 建成

- 发布 miner

## RCL 8

- 移除所有的 remoteUpgrader