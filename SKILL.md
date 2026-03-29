---
name: memory-qdrant
description: 团队向量记忆技能 - 自动捕获对话到 Qdrant + Ollama bge-m3，支持语义搜索和持久化存储
metadata: {"openclaw": {"requires": {"bins": [], "env": [], "config": ["plugins.entries.memory-qdrant.enabled"]}}}
---

# memory-qdrant - 团队向量记忆技能

**OpenClaw Memory Plugin** - 自动捕获对话到 Qdrant + Ollama bge-m3

## 🎯 触发场景

**TRIGGER when**:
- 用户要求"记住 XXX"、"保存这个"、"记录一下"
- 用户询问历史、之前的内容、"我们之前说过..."
- 需要团队共享知识库
- 项目里程碑、重大决策需要记录

**DO NOT TRIGGER for**:
- 简单的问候和闲聊
- 临时性、无需长期存储的信息
- 用户明确表示"不要记住"

## 🔧 可用工具

### memory_store - 保存记忆

```
当用户说"记住：XXX"时调用

参数:
- text: 要保存的文本内容 (必需)
- category: 分类 memory/code/decision (可选，默认 memory)
- metadata: 额外元数据 (可选)
```

### memory_search - 搜索记忆

```
当用户问"我们之前说过..."、"记得吗..."时调用

参数:
- query: 搜索关键词或问题 (必需)
- category: 分类 (可选，默认 memory)
- limit: 返回数量 1-20 (可选，默认 5)
```

### memory_forget - 删除记忆

```
当用户要求删除某条记忆时调用

参数:
- memoryId: 要删除的记忆ID (必需)
- category: 分类 (可选，默认 memory)
```

## ⚙️ 配置

在 `~/.openclaw/openclaw.json` 中配置:

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

## 🚀 自动功能

当 `autoCapture: true` 时，**每条对话都会自动保存**到 Qdrant。

## 📦 依赖

- Qdrant v1.13.4+ (运行在 localhost:6333)
- Ollama + bge-m3 模型 (运行在 localhost:11434)

---

_版本：1.0.0 | 创建时间：2026-03-29_