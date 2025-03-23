# AgentKai 发布流程速查表

## 重要提示
**在发布过程中，`version-packages`与`release`之间必须提交文件变更，否则git标签将不包含版本更新！**

## 手动发布流程

**快速方法 (推荐):**
```bash
# 全自动发布流程
pnpm publish-all
```

**标准方法:**
```bash
# 1. 记录变更
pnpm changeset

# 2. 更新版本+提交
pnpm version-and-commit

# 3. 构建并发布
pnpm release

# 4. 推送更改
git push && git push --tags
```

**详细方法:**
```bash
# 1. 记录变更
pnpm changeset

# 2. 更新版本号
pnpm version-packages  

# 3. 提交变更
git add .
git commit -m "chore: version packages"

# 4. 构建并发布
pnpm release

# 5. 推送更改
git push && git push --tags
```

## 常见问题

1. **问题**: 版本标签不包含更新的版本号和CHANGELOG
   **原因**: 没有在`version-packages`和`release`之间提交更改
   **解决**: 使用`pnpm publish-all`或确保在`release`前提交所有更改

2. **问题**: 发布失败，提示权限问题
   **解决**: 运行`npm login`确保有发布权限

3. **问题**: 多个包版本不一致
   **解决**: 使用`pnpm version-packages`会自动处理依赖包的版本更新

## GitHub Actions 发布

也可以通过GitHub Actions触发发布流程:

1. 进入项目GitHub仓库
2. 点击"Actions"标签
3. 选择"Publish Packages"工作流
4. 点击"Run workflow"
5. 选择版本类型(patch/minor/major)并触发

详细信息请参考[完整发布文档](./MONOREPO_RELEASE.md)。 