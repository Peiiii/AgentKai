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

2. 创建本地包测试：
   ```bash
   npm pack
   ```

3. 验证包内容：
   ```bash
   tar -tzf agentkai-x.y.z.tgz
   ```

4. 在一个临时目录中安装和测试这个包：
   ```bash
   mkdir -p /tmp/agentkai-test
   cp agentkai-x.y.z.tgz /tmp/agentkai-test/
   cd /tmp/agentkai-test
   npm i agentkai-x.y.z.tgz
   node -e "const agentkai = require('agentkai'); console.log(Object.keys(agentkai));"
   ```

5. 运行示例代码：
   ```bash
   cd /tmp/agentkai-test
   node node_modules/agentkai/dist/examples/simple-example.js
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
   npm install -g agentkai
   ```

2. 测试命令行工具：
   ```bash
   agentkai --help
   ```

3. 在一个新项目中测试引入：
   ```bash
   mkdir test-project && cd test-project
   npm init -y
   npm install agentkai
   # 测试导入
   node -e "const { AISystem } = require('agentkai'); console.log(AISystem)"
   ```

## 撤回版本

如果发现发布的版本有问题，可以在24小时内撤回：

```bash
npm unpublish agentkai@x.y.z
```

> 注意：npm规定只能在发布后的72小时内撤回，并且撤回后24小时内不能发布同名版本。 