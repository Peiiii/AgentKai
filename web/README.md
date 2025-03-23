# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/README.md) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default tseslint.config({
  extends: [
    // Remove ...tseslint.configs.recommended and replace with this
    ...tseslint.configs.recommendedTypeChecked,
    // Alternatively, use this for stricter rules
    ...tseslint.configs.strictTypeChecked,
    // Optionally, add this for stylistic rules
    ...tseslint.configs.stylisticTypeChecked,
  ],
  languageOptions: {
    // other options...
    parserOptions: {
      project: ['./tsconfig.node.json', './tsconfig.app.json'],
      tsconfigRootDir: import.meta.dirname,
    },
  },
})
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default tseslint.config({
  plugins: {
    // Add the react-x and react-dom plugins
    'react-x': reactX,
    'react-dom': reactDom,
  },
  rules: {
    // other rules...
    // Enable its recommended typescript rules
    ...reactX.configs['recommended-typescript'].rules,
    ...reactDom.configs.recommended.rules,
  },
})
```

# AgentKai Web 界面

这是AgentKai智能助手的Web用户界面实现，基于React + TypeScript + Vite构建。

## 环境变量配置

项目使用环境变量来配置AI系统的各项参数。请按照以下步骤进行配置：

1. 在项目根目录复制`.env.example`文件为`.env`：

```bash
cp .env.example .env
```

2. 编辑`.env`文件，填入你的API密钥和其他配置：

```
# 必填项
VITE_OPENAI_API_KEY=你的OpenAI API密钥

# 可选项（已提供默认值）
VITE_MODEL_NAME=gpt-4o
VITE_TEMPERATURE=0.7
# 更多配置...
```

### 可配置的环境变量

| 变量名 | 说明 | 默认值 |
|-------|------|-------|
| VITE_OPENAI_API_KEY | OpenAI API密钥 | - |
| VITE_MODEL_NAME | 使用的大语言模型 | gpt-4o |
| VITE_TEMPERATURE | 模型温度参数 | 0.7 |
| VITE_MAX_TOKENS | 最大输出token数 | 2048 |
| VITE_OPENAI_API_BASE_URL | OpenAI API基础URL | https://api.openai.com/v1 |
| VITE_EMBEDDING_MODEL | 嵌入模型名称 | text-embedding-v3 |
| VITE_EMBEDDING_DIMENSIONS | 嵌入向量维度 | 1024 |
| VITE_APP_NAME | 应用名称 | 凯 |
| VITE_DEFAULT_LANGUAGE | 默认语言 | zh-CN |

## 开发指南
