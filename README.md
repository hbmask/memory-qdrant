# Memory Qdrant - OpenClaw 团队向量记忆插件

> 基于 Qdrant + Ollama bge-m3 的团队对话记忆系统

## 🎯 功能特性

- ✅ **自动捕获对话** - 可配置关键词过滤
- ✅ **语义搜索** - 使用 bge-m3 向量模型
- ✅ **本地部署** - 数据完全本地化，隐私安全
- ✅ **团队共享** - 所有 Agent 访问同一知识库
- ✅ **灵活配置** - 支持开关、关键词过滤

## 📦 依赖

| 服务 | 版本 | 用途 |
|------|------|------|
| Qdrant | v1.13.4+ | 向量数据库 |
| Ollama | 最新 | 嵌入模型服务 |
| bge-m3 | - | 嵌入模型 (1024维) |

## 🚀 快速开始

### 1. 启动依赖服务

```bash
# 启动 Qdrant
docker run -d -p 6333:6333 qdrant/qdrant

# 启动 Ollama 并下载模型
ollama pull bge-m3
```

### 2. 安装插件

```bash
openclaw plugins install /path/to/memory-qdrant
```

### 3. 配置

在 `~/.openclaw/openclaw.json` 中添加：

```json
{
  "plugins": {
    "entries": {
      "memory-qdrant": {
        "enabled": true,
        "config": {
          "qdrantUrl": "http://localhost:6333",
          "ollamaUrl": "http://localhost:11434",
          "embeddingModel": "bge-m3",
          "autoCapture": true,
          "autoRecall": true,
          "captureKeywords": ["记住", "总结", "项目", "需求"],
          "collections": {
            "memory": "team_memory_v3",
            "code": "code_index_v3",
            "decision": "decision_log_v3"
          }
        }
      }
    }
  }
}
```

### 4. 重启 Gateway

```bash
openclaw gateway restart
```

## ⚙️ 配置说明

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `qdrantUrl` | string | `http://localhost:6333` | Qdrant 服务地址 |
| `ollamaUrl` | string | `http://localhost:11434` | Ollama 服务地址 |
| `embeddingModel` | string | `bge-m3` | 嵌入模型名称 |
| `autoCapture` | boolean | `true` | 自动捕获开关 |
| `autoRecall` | boolean | `true` | 自动召回开关 |
| `captureKeywords` | string[] | `[]` | 关键词过滤（空=捕获全部） |
| `collections` | object | 见上 | Qdrant 集合映射 |

## 📖 使用场景

### 自动捕获模式

配置 `autoCapture: true` 后，包含关键词的对话会自动保存：

```
用户: 记住这个项目的接口地址是 /api/v1/user
助手: 已记录...  ✅ 自动保存（包含"记住"、"项目"、"接口"）
```

### 手动保存

```
用户: 记住：团队规范要求代码必须有注释
助手: ✅ 已保存到记忆库
```

### 搜索记忆

```
用户: 我们之前说的接口地址是什么？
助手: 🔍 找到 2 条相关记忆...
```

## 🔧 API 工具

| 工具 | 用途 |
|------|------|
| `memory_store` | 手动保存记忆 |
| `memory_search` | 搜索记忆 |
| `memory_forget` | 删除记忆 |

## 📁 项目结构

```
memory-qdrant/
├── src/
│   ├── index.ts          # 插件入口
│   ├── qdrant-client.ts  # Qdrant 客户端
│   ├── ollama-embed.ts   # Ollama 嵌入客户端
│   └── openclaw.d.ts     # 类型定义
├── dist/                 # 编译输出
├── package.json
├── tsconfig.json
├── openclaw.plugin.json  # OpenClaw 插件清单
└── SKILL.md              # 技能说明
```

## 🔐 安全与隐私

- ✅ **完全本地** - 无外部 API 调用
- ✅ **数据可控** - Qdrant 本地存储
- ✅ **关键词过滤** - 可控制哪些对话被保存
- ✅ **开关控制** - 可随时关闭自动捕获

## 📝 更新日志

### v1.1.0 (2026-03-29)
- ✨ 新增关键词过滤功能
- 🐛 修复变量定义顺序错误
- 📝 完善 README 文档

### v1.0.0 (2026-03-29)
- 🎉 初始版本
- ✅ 自动捕获对话
- ✅ 向量搜索
- ✅ Qdrant + Ollama 集成

## 👥 作者

TeamClaw

## 📄 许可证

MIT