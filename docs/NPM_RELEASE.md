# NPM发布流程

本文档描述了AgentKai项目的npm发布流程。

## 准备工作

1. 确保`package.json`文件包含所有必要的字段：
   - `name`：包名称（agentkai）
   - `version`：版本号（遵循语义化版本规范）
   - `description`：包描述
   - `main`：主入口文件
   - `types`：TypeScript类型定义文件
   - `bin`：CLI入口
   - `files`：指定要包含在发布包中的文件
   - `repository`：代码仓库信息
   - `keywords`：关键字
   - `author`：作者信息
   - `license`：许可证信息

2. 确保项目根目录包含以下文件：
   - `README.md`：项目文档
   - `LICENSE`：许可证文件

3. 确保`src/index.ts`文件导出所有公共API组件。

## 测试流程

在发布之前，运行以下测试：

1. 本地构建测试：
   ```bash
   npm run build
   ```

2. 使用npm link进行本地CLI测试：
   ```bash
   # 在项目目录中创建全局链接
   npm link
   
   # 现在可以全局使用CLI工具进行测试
   agentkai --help
   
   # 测试各种命令
   agentkai --version
   agentkai chat --debug
   agentkai memory --list
   ```

3. 预发布测试（不实际发布）：
   ```bash
   npm publish --dry-run
   ```
   这会模拟发布过程并显示将要发布的内容，但不会实际发布包。

4. 验证包作为库的导入功能：
   ```bash
   # 创建测试脚本
   echo "const { AISystem, Logger } = require('./dist'); console.log('导入成功！', Object.keys(require('./dist')).length);" > test-import.js
   
   # 运行测试脚本
   node test-import.js
   ```

## 版本管理

使用npm的内置版本管理：

```bash
# 更新补丁版本 (1.0.0 -> 1.0.1)
npm version patch

# 更新次版本 (1.0.0 -> 1.1.0)
npm version minor

# 更新主版本 (1.0.0 -> 2.0.0)
npm version major
```

## 发布流程

1. 确认登录到npm账号：
   ```bash
   npm login
   ```

2. 发布包：
   ```bash
   npm publish
   ```

3. 检查发布结果：
   ```bash
   npm view agentkai
   ```

## 发布后的验证

1. 全局安装测试：
   ```bash
   # 清除之前的npm link
   npm unlink -g agentkai
   
   # 全局安装发布的包
   npm install -g agentkai
   ```

2. 测试命令行工具：
   ```bash
   # 版本检查
   agentkai --version
   
   # 帮助信息
   agentkai --help
   
   # 功能测试
   agentkai --log-level debug memory --list
   ```

3. 在一个新项目中测试引入：
   ```bash
   mkdir test-project && cd test-project
   npm init -y
   npm install agentkai
   
   # 创建测试脚本
   echo "const { AISystem, Logger } = require('agentkai'); console.log('成功导入agentkai库！');" > test.js
   
   # 运行测试
   node test.js
   ```

## 持续集成与自动发布

对于未来的版本，可以设置GitHub Actions工作流来自动化发布过程：

```yaml
# .github/workflows/publish.yml
name: Publish Package

on:
  release:
    types: [created]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '16.x'
          registry-url: 'https://registry.npmjs.org/'
      - run: npm ci
      - run: npm run build
      - run: npm test
      - run: npm publish
        env:
          NODE_AUTH_TOKEN: ${{secrets.NPM_TOKEN}}
```

## 撤回版本

如果发现发布的版本有问题，可以在72小时内撤回：

```bash
npm unpublish agentkai@x.y.z
```

> 注意：npm规定只能在发布后的72小时内撤回，并且撤回后24小时内不能发布同名版本。

## 发布前准备事项

### 测试修复

在尝试发布前，请确保修复所有单元测试和类型问题：

1. **类型错误修复**：
   - 确保所有测试文件中的类型定义与最新的接口定义匹配
   - 特别注意`ModelConfig`、`MemoryConfig`和`DecisionConfig`接口可能的变更
   - 修复测试中的调用参数，使其符合当前的函数签名

2. **单元测试更新**：
   - 更新测试用例以反映最新的功能和接口变更
   - 修复模拟对象的返回值，使其符合当前的期望格式
   - 确保测试覆盖率达到配置的阈值（目前为80%）

在运行`npm publish`前，请确保所有测试能够通过：

```bash
# 修复lint警告（可选，但建议修复）
npm run lint -- --fix

# 修复单元测试
npm test

# 尝试构建
npm run build
```

只有当所有测试通过后，才能继续发布流程。 