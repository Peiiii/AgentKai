# Monorepo发布最佳实践

本文档描述了AgentKai项目在monorepo架构下的包发布最佳实践。

## 快速发布指南

如果您需要立即发布包，请按照以下步骤操作：

```bash
# 1. 记录变更（会交互式提示选择包和版本类型）
pnpm changeset

# 2. 更新受影响包的版本号
pnpm version-packages  

# 3. 提交版本更新产生的文件变更（重要！）
git add .
git commit -m "chore: version packages"

# 4. 构建所有包并发布到npm（会自动创建git标签）
pnpm release

# 5. 推送提交和标签到远程仓库
git push
git push --tags
```

> **重要提示**: 在步骤2和步骤4之间，必须提交`version-packages`生成的文件更改（包括版本号更新和CHANGELOG更新），否则创建的git标签将不包含这些更改。

## 当前项目设置

AgentKai使用PNPM Workspace来管理monorepo:

- 使用PNPM作为包管理器，通过`pnpm-workspace.yaml`配置工作区
- 使用Changesets进行版本管理和发布
- 内部依赖使用`workspace:*`语法（如CLI包依赖Core包）
- 所有包都配置了`"access": "public"`表示要发布为公共包

## 详细发布流程

### 1. 准备工作

确保你已登录npm并有发布权限：

```bash
# 检查当前npm登录状态
npm whoami

# 如果未登录，请登录
npm login
```

### 2. 记录变更

使用changeset记录包的变更：

```bash
pnpm changeset
```

这个命令会引导你完成以下步骤：
- 选择受影响的包（可多选）
- 为每个包选择版本变更类型（patch/minor/major）
- 输入变更描述（会生成CHANGELOG）

完成后，将在`.changeset`目录下创建一个新的变更文件。

### 3. 更新版本

应用变更并更新package.json中的版本号：

```bash
pnpm version-packages
```

这个命令会：
- 读取`.changeset`目录中的变更文件
- 更新所有受影响包的版本号
- 更新内部依赖引用
- 更新CHANGELOG.md文件

> **注意**：`version-packages`命令只会修改文件，不会自动提交这些更改到git。你必须手动提交这些更改。

### 4. 提交版本更改

这一步非常重要，必须手动提交版本更新产生的文件变更：

```bash
git add .
git commit -m "chore: version packages"
```

如果跳过这一步，后续发布时创建的git标签将不包含版本更新的变更。

### 5. 构建和发布

构建所有包并发布到npm：

```bash
# 确保所有包都已构建
pnpm build

# 发布所有有变更的包
pnpm release
```

`pnpm release`命令会：
- 将所有带有新版本的包发布到npm
- 将`workspace:*`引用转换为实际版本号
- 创建git标签，但不会提交文件变更（这就是为什么步骤4很重要）

### 6. 推送更改

发布完成后，推送所有更改和标签到远程仓库：

```bash
git push
git push --tags
```

## 语义化版本控制 (Semver)

选择版本类型的指导原则:

- **patch** (1.0.0 → 1.0.1): 修复bug，不影响API
- **minor** (1.0.0 → 1.1.0): 新增功能，不破坏现有API
- **major** (1.0.0 → 2.0.0): 引入破坏性变更，可能需要用户修改代码

## 依赖关系处理

monorepo中依赖关系的自动处理:

1. **内部依赖管理**:
   - 开发时使用`"@agentkai/core": "workspace:*"`
   - 发布时会自动转换为实际版本号，如`"@agentkai/core": "1.5.0"`

2. **依赖版本更新**:
   - 当core包更新，cli包会自动更新依赖关系
   - 根据配置文件中的`updateInternalDependencies`设置（当前为"patch"）

## 高级用法

### 发布特定包

如果只想发布特定的包：

```bash
# 只为特定包创建变更
pnpm changeset --scope=@agentkai/cli

# 更新版本
pnpm version-packages

# 提交版本更改
git add .
git commit -m "chore: version cli package"

# 过滤构建和发布
pnpm --filter=@agentkai/cli build
pnpm --filter=@agentkai/cli publish
```

### 预发布（Beta/Alpha）版本

发布测试版本：

```bash
# 进入预发布模式
pnpm changeset pre enter beta

# 添加变更
pnpm changeset

# 更新版本（会产生如1.0.0-beta.1格式的版本）
pnpm version-packages

# 提交版本更改
git add .
git commit -m "chore: version beta packages"

# 发布beta版本
pnpm release

# 完成测试后，退出预发布模式
pnpm changeset pre exit
```

### 发布后验证

验证发布结果：

```bash
# 查看已发布的包信息
npm view @agentkai/cli
npm view @agentkai/core

# 安装并测试发布的包
npm create @agentkai/test-app
cd test-app
npm install @agentkai/cli
```

## 自动化工作流

为简化流程，您可以在`package.json`中添加以下脚本：

```json
"scripts": {
  "version-and-commit": "pnpm version-packages && git add . && git commit -m 'chore: version packages'",
  "publish-all": "pnpm version-and-commit && pnpm release && git push && git push --tags"
}
```

这样您可以使用`pnpm publish-all`一键完成从版本更新到发布的全过程。

## 常见问题与解决方案

1. **版本标签不包含版本更新**：
   - 原因：没有在`version-packages`后提交更改
   - 解决：按照完整流程，确保在`release`前提交所有更改

2. **发布失败**：
   - 检查npm登录状态：`npm whoami`
   - 检查包名是否已被占用：`npm view [package-name]`
   - 确认包的版本号是否已存在：`npm view [package-name] versions`

3. **依赖版本问题**：
   - 检查pnpm是否正确转换了workspace引用
   - 使用`npm pack`命令预览即将发布的包内容

## 最佳实践总结

- **完整流程**：坚持 changeset → version-packages → commit → release 的完整流程
- **版本管理**：使用Changesets记录每个包的变更并自动更新相关依赖
- **CI/CD集成**：在GitHub Actions中自动执行发布流程
- **锁定内部依赖版本**：发布时会自动处理`workspace:*`引用
- **包互相依赖**：保持核心包与应用包版本的一致性
- **包含必要文件**：通过`"files"`字段只发布必要文件

通过严格遵循上述实践，可以确保monorepo结构下的包发布流程顺畅，版本管理一致且依赖关系正确。 