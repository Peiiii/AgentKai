# Core 包发布指南

本文档专门针对 `@agentkai/core` 包的变更和发布流程进行说明。由于 core 包是整个项目的核心依赖，其变更需要特别谨慎处理。

## Core 包的特殊性

1. **依赖关系**
   - `@agentkai/core` 是基础包，被其他包依赖
   - 包括：`@agentkai/node`、`@agentkai/browser`、`@agentkai/cli` 等
   - 任何 core 的变更都可能影响到这些依赖包

2. **版本影响**
   - core 包的版本更新会触发依赖包的版本更新
   - 根据 `.changeset/config.json` 的配置，依赖包会自动进行补丁版本更新

## 发布流程

### 1. 评估变更影响

在创建 changeset 之前，请评估您的变更：

- [ ] 是否修改了公共 API？
- [ ] 是否引入了破坏性变更？
- [ ] 是否影响到依赖包的功能？
- [ ] 是否需要依赖包做相应调整？

### 2. 选择版本类型

根据变更性质选择合适的版本类型：

- **patch** (1.0.0 → 1.0.1)
  - 修复 bug
  - 性能优化
  - 不影响 API 的内部重构
  
- **minor** (1.0.0 → 1.1.0)
  - 新增功能
  - 新增 API
  - 不破坏现有功能的变更
  
- **major** (1.0.0 → 2.0.0)
  - 破坏性 API 变更
  - 删除或重命名公共 API
  - 需要依赖包修改代码的变更

### 3. 创建变更记录

```bash
# 方式 1：交互式创建（推荐）
pnpm changeset

# 方式 2：仅针对 core 包创建
pnpm changeset --scope=@agentkai/core
```

在描述变更时：
1. 使用清晰的英文描述
2. 说明变更的动机和影响
3. 如果有破坏性变更，需要说明迁移方法

### 4. 发布步骤

推荐使用一键发布命令：

```bash
pnpm publish-all
```

这将自动完成：
1. 更新 core 包版本
2. 更新依赖包版本
3. 更新所有 CHANGELOG
4. 构建并发布包
5. 创建 git 标签
6. 推送到远程仓库

### 5. 验证发布

发布后请验证：

```bash
# 1. 检查 core 包是否正确发布
npm view @agentkai/core versions

# 2. 检查依赖包是否正确更新
npm view @agentkai/node
npm view @agentkai/browser
npm view @agentkai/cli

# 3. 验证包的功能
pnpm test
```

## 特殊情况处理

### 1. 破坏性变更

如果需要进行破坏性变更：

1. 创建新的 major 版本分支
2. 在分支中完成变更
3. 创建详细的迁移指南
4. 使用 major 版本发布

### 2. 紧急修复

如果需要对已发布版本进行紧急修复：

1. 从对应版本标签创建修复分支
2. 在分支中进行修复
3. 使用 patch 版本发布
4. 将修复合并回主分支

### 3. 预发布测试

如果需要在正式发布前进行测试：

```bash
# 进入 beta 预发布模式
pnpm changeset pre enter beta

# 创建变更
pnpm changeset

# 发布 beta 版本
pnpm publish-all

# 测试完成后退出预发布模式
pnpm changeset pre exit
```

## 最佳实践

1. **保持向后兼容**
   - 尽量避免破坏性变更
   - 使用废弃警告提示 API 变更
   - 提供平滑迁移方案

2. **完善的测试**
   - 确保单元测试覆盖变更
   - 添加集成测试验证依赖包
   - 在不同环境中验证功能

3. **清晰的文档**
   - 更新 API 文档
   - 编写变更说明
   - 提供使用示例

4. **版本控制**
   - 遵循语义化版本规范
   - 保持版本号一致性
   - 及时更新依赖关系

## 常见问题

1. **Q: 如何处理依赖包的版本更新？**
   A: Changesets 会自动处理依赖关系，您只需要关注 core 包的变更。

2. **Q: 发布失败怎么办？**
   A: 检查 npm 登录状态，确保有发布权限，查看错误日志定位具体原因。

3. **Q: 如何撤销错误的发布？**
   A: npm 不支持撤销发布，建议发布新版本进行修复。

## 相关文档

- [Monorepo发布最佳实践](./MONOREPO_RELEASE.md)
- [发布流程速查表](./RELEASE_CHEATSHEET.md)
- [NPM发布指南](./NPM_RELEASE.md) 