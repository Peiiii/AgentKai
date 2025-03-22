# GoalManager

目标管理系统，支持目标的创建、更新、删除和状态管理。

## 功能特性

- 目标持久化存储
- 目标状态管理
- 目标优先级管理
- 目标依赖关系管理
- 子目标管理
- 活跃目标数量限制
- 缓存机制
- 数据验证
- 防抖保存

## 使用示例

```typescript
import { GoalManager } from './GoalManager';
import { GoalStatus } from '../types';

// 创建 GoalManager 实例
const goalManager = new GoalManager();

// 添加新目标
const goal = await goalManager.addGoal({
    description: '完成项目文档',
    priority: 1,
    dependencies: [],
    subGoals: [],
    metadata: {}
});

// 更新目标状态
await goalManager.updateGoal(goal.id, {
    status: GoalStatus.ACTIVE,
    progress: 50
});

// 添加目标依赖
await goalManager.addDependency(childGoalId, parentGoalId);

// 获取活跃目标
const activeGoals = await goalManager.getActiveGoals();

// 获取已完成目标
const completedGoals = await goalManager.getCompletedGoals();
```

## API 文档

### 构造函数

```typescript
constructor(storage?: GoalStorageProvider)
```

创建一个新的 GoalManager 实例。可选参数 `storage` 用于指定自定义的存储提供者。

### 方法

#### addGoal
添加新目标

```typescript
async addGoal(params: Omit<Goal, 'id' | 'createdAt' | 'status' | 'progress'>): Promise<Goal>
```

参数：
- `params.description`: 目标描述
- `params.priority`: 目标优先级
- `params.dependencies`: 依赖的目标 ID 列表
- `params.subGoals`: 子目标 ID 列表
- `params.metadata`: 额外的元数据

返回：新创建的目标对象

#### updateGoal
更新目标

```typescript
async updateGoal(id: string, updates: Partial<Omit<Goal, 'id' | 'createdAt'>>): Promise<Goal | null>
```

参数：
- `id`: 目标 ID
- `updates`: 要更新的字段

返回：更新后的目标对象，如果目标不存在则返回 null

#### deleteGoal
删除目标

```typescript
async deleteGoal(id: string): Promise<boolean>
```

参数：
- `id`: 目标 ID

返回：是否成功删除

#### getGoal
获取单个目标

```typescript
async getGoal(id: string): Promise<Goal | null>
```

参数：
- `id`: 目标 ID

返回：目标对象，如果不存在则返回 null

#### getGoals
获取所有目标

```typescript
async getGoals(): Promise<Goal[]>
```

返回：所有目标的数组

#### getActiveGoals
获取活跃目标

```typescript
async getActiveGoals(): Promise<Goal[]>
```

返回：所有状态为 ACTIVE 的目标数组

#### getPendingGoals
获取待处理目标

```typescript
async getPendingGoals(): Promise<Goal[]>
```

返回：所有状态为 PENDING 的目标数组

#### getCompletedGoals
获取已完成目标

```typescript
async getCompletedGoals(): Promise<Goal[]>
```

返回：所有状态为 COMPLETED 的目标数组

#### addDependency
添加目标依赖关系

```typescript
async addDependency(childId: string, parentId: string): Promise<boolean>
```

参数：
- `childId`: 子目标 ID
- `parentId`: 父目标 ID

返回：是否成功添加依赖关系

#### removeDependency
移除目标依赖关系

```typescript
async removeDependency(childId: string, parentId: string): Promise<boolean>
```

参数：
- `childId`: 子目标 ID
- `parentId`: 父目标 ID

返回：是否成功移除依赖关系

#### balanceActiveGoals
平衡活跃目标数量

```typescript
async balanceActiveGoals(): Promise<void>
```

根据优先级调整活跃目标的数量，确保不超过最大限制。

#### checkGoalCompletion
检查目标完成状态

```typescript
async checkGoalCompletion(goalId: string): Promise<void>
```

参数：
- `goalId`: 目标 ID

检查目标的所有子目标是否都已完成，如果是则自动将目标标记为已完成。

## 性能优化

- 使用内存缓存减少文件系统访问
- 实现防抖保存机制，避免频繁写入
- 异步操作不阻塞主线程
- 使用 Map 数据结构提供 O(1) 的查找性能

## 数据验证

- 目标描述不能为空
- 优先级必须为非负数
- 进度必须在 0-100 之间

## 错误处理

- 所有方法都有适当的错误处理
- 文件操作有错误恢复机制
- 防止循环依赖
- 类型安全

## 注意事项

- 活跃目标数量限制为 3 个
- 缓存过期时间为 5 秒
- 保存防抖时间为 1 秒
- 所有操作都是异步的 