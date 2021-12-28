# Terminal 管理模块

负责房间与外界的资源流转工作，需要共享模块、物流模块的协助。具体功能实现如下：

- `./hooks/useMaintenance.ts`：包含一些基础独立的运维功能
- `./hooks/useTaskListener.ts`：监听房间内的资源任务，并在对应时机触发资源流转工作
- `./hooks/useDealOrder.ts`：当任务监听功能确定了一个订单后，会由本功能完成订单处理
