/**
 * OpenClaw Memory Qdrant Plugin
 * 
 * 团队向量记忆插件 - 自动捕获对话到 Qdrant + Ollama bge-m3
 * 
 * @author TeamClaw
 * @version 1.0.0
 */

import { definePluginEntry } from 'openclaw/plugin-sdk/plugin-entry';
import { Type } from '@sinclair/typebox';
import { QdrantClient } from './qdrant-client.js';
import { OllamaEmbedding } from './ollama-embed.js';
import { randomUUID } from 'crypto';

// Plugin config interface
interface MemoryQdrantConfig {
  qdrantUrl: string;
  ollamaUrl: string;
  embeddingModel: string;
  autoCapture: boolean;
  autoRecall: boolean;
  captureKeywords: string[]; // 关键词过滤
  collections: {
    memory: string;
    code: string;
    decision: string;
  };
}

// Default config
const defaultConfig: MemoryQdrantConfig = {
  qdrantUrl: 'http://localhost:6333',
  ollamaUrl: 'http://localhost:11434',
  embeddingModel: 'bge-m3',
  autoCapture: true,
  autoRecall: true,
  captureKeywords: [], // 关键词过滤：为空时捕获全部，有值时只捕获包含关键词的对话
  collections: {
    memory: 'team_memory_v3',
    code: 'code_index_v3',
    decision: 'decision_log_v3',
  },
};

export default definePluginEntry({
  id: 'memory-qdrant',
  name: 'Memory Qdrant',
  description: '团队向量记忆插件 - 自动捕获对话到 Qdrant + Ollama bge-m3',
  
  register(api) {
    // Get plugin config
    const config: MemoryQdrantConfig = {
      ...defaultConfig,
      ...(api.pluginConfig as Partial<MemoryQdrantConfig> || {}),
    };

    // Initialize clients
    const qdrant = new QdrantClient(config.qdrantUrl);
    const ollama = new OllamaEmbedding(config.ollamaUrl, config.embeddingModel);

    const logger = api.logger;

    // ==========================================
    // Tool: memory_store
    // ==========================================
    api.registerTool({
      name: 'memory_store',
      description: '保存记忆到向量数据库。当用户要求"记住XXX"或需要持久化重要信息时使用。',
      parameters: Type.Object({
        text: Type.String({ description: '要保存的文本内容' }),
        category: Type.Optional(Type.String({ 
          description: '分类: memory(默认), code, decision',
          default: 'memory' 
        })),
        metadata: Type.Optional(Type.Record(Type.String(), Type.Unknown(), {
          description: '额外的元数据',
        })),
      }),
      async execute(_id: string, params: Record<string, unknown>) {
        try {
          const text = params.text as string;
          const category = (params.category as string) || 'memory';
          const metadata = (params.metadata as Record<string, unknown>) || {};
          
          // Generate embedding
          const vector = await ollama.embed(text);
          
          // Get collection name
          const collectionName = config.collections[category as keyof typeof config.collections] || config.collections.memory;
          
          // Generate ID and payload
          const id = randomUUID();
          const payload = {
            content: text,
            category,
            timestamp: new Date().toISOString(),
            agent_id: api.id,
            ...metadata,
          };
          
          // Store to Qdrant
          await qdrant.upsert(collectionName, [{ id, vector, payload }]);
          
          logger.info(`[memory_store] Saved to ${collectionName}: ${id}`);
          
          const textPreview = text.length > 100 ? text.substring(0, 100) + '...' : text;
          
          return {
            content: [{
              type: 'text' as const,
              text: `✅ 已保存到记忆库\n\n**ID**: ${id}\n**分类**: ${category}\n**内容**: ${textPreview}`,
            }],
          };
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          logger.error(`[memory_store] Error: ${message}`);
          return {
            content: [{
              type: 'text' as const,
              text: `❌ 保存失败: ${message}`,
            }],
          };
        }
      },
    });

    // ==========================================
    // Tool: memory_search
    // ==========================================
    api.registerTool({
      name: 'memory_search',
      description: '在向量数据库中搜索相关记忆。当用户询问历史信息或需要回忆之前的内容时使用。',
      parameters: Type.Object({
        query: Type.String({ description: '搜索关键词或问题' }),
        category: Type.Optional(Type.String({ 
          description: '分类: memory(默认), code, decision',
          default: 'memory' 
        })),
        limit: Type.Optional(Type.Number({ 
          description: '返回结果数量',
          default: 5,
          minimum: 1,
          maximum: 20,
        })),
      }),
      async execute(_id: string, params: Record<string, unknown>) {
        try {
          const query = params.query as string;
          const category = (params.category as string) || 'memory';
          const limit = (params.limit as number) || 5;
          
          // Generate embedding for query
          const vector = await ollama.embed(query);
          
          // Get collection name
          const collectionName = config.collections[category as keyof typeof config.collections] || config.collections.memory;
          
          // Search Qdrant
          const results = await qdrant.search(collectionName, vector, limit);
          
          if (results.length === 0) {
            return {
              content: [{
                type: 'text' as const,
                text: `未找到相关记忆。`,
              }],
            };
          }
          
          // Format results
          const formatted = results.map((r, i) => {
            const content = (r.payload?.content as string) || '(无内容)';
            const timestamp = (r.payload?.timestamp as string) || '';
            return `**${i + 1}.** ${content}\n   - 相关度: ${(r.score * 100).toFixed(1)}%\n   - 时间: ${timestamp}`;
          }).join('\n\n');
          
          logger.info(`[memory_search] Found ${results.length} results in ${collectionName}`);
          
          return {
            content: [{
              type: 'text' as const,
              text: `🔍 找到 ${results.length} 条相关记忆:\n\n${formatted}`,
            }],
          };
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          logger.error(`[memory_search] Error: ${message}`);
          return {
            content: [{
              type: 'text' as const,
              text: `❌ 搜索失败: ${message}`,
            }],
          };
        }
      },
    });

    // ==========================================
    // Tool: memory_forget
    // ==========================================
    api.registerTool({
      name: 'memory_forget',
      description: '从向量数据库中删除记忆。当用户要求删除或遗忘某条记忆时使用。',
      parameters: Type.Object({
        memoryId: Type.String({ description: '要删除的记忆ID' }),
        category: Type.Optional(Type.String({ 
          description: '分类: memory(默认), code, decision',
          default: 'memory' 
        })),
      }),
      async execute(_id: string, params: Record<string, unknown>) {
        try {
          const memoryId = params.memoryId as string;
          const category = (params.category as string) || 'memory';
          
          // Get collection name
          const collectionName = config.collections[category as keyof typeof config.collections] || config.collections.memory;
          
          // Delete from Qdrant
          await qdrant.delete(collectionName, [memoryId]);
          
          logger.info(`[memory_forget] Deleted ${memoryId} from ${collectionName}`);
          
          return {
            content: [{
              type: 'text' as const,
              text: `✅ 已删除记忆: ${memoryId}`,
            }],
          };
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          logger.error(`[memory_forget] Error: ${message}`);
          return {
            content: [{
              type: 'text' as const,
              text: `❌ 删除失败: ${message}`,
            }],
          };
        }
      },
    });

    // ==========================================
    // Hook: agent_end - Auto Capture
    // ==========================================
    if (config.autoCapture) {
      api.on('agent_end', async (event: Record<string, unknown>) => {
        logger.info('[autoCapture] agent_end event received:', JSON.stringify({
          success: event.success,
          hasMessages: !!event.messages,
          messageCount: Array.isArray(event.messages) ? event.messages.length : 0,
          sessionId: event.sessionId,
          agentId: event.agentId,
          accountId: event.accountId,
        }));
        
        try {
          // 检查事件是否成功
          if (!event.success || !event.messages) {
            logger.info('[autoCapture] Event check failed, skipping');
            return;
          }
          
          const messages = event.messages as Array<Record<string, unknown>>;
          
          if (messages.length === 0) {
            return;
          }
          
          // 提取用户消息
          const userTexts: string[] = [];
          for (const msg of messages) {
            if (!msg || typeof msg !== 'object') continue;
            if (msg.role !== 'user') continue;
            
            const content = msg.content;
            if (typeof content === 'string') {
              userTexts.push(content);
            } else if (Array.isArray(content)) {
              for (const block of content) {
                if (block && typeof block === 'object' && block.type === 'text' && typeof block.text === 'string') {
                  userTexts.push(block.text);
                }
              }
            }
          }
          
          if (userTexts.length === 0) {
            return;
          }
          
          // 只处理最后一条用户消息
          const lastUserMessage = userTexts[userTexts.length - 1];
          
          // Skip short messages
          if (lastUserMessage.trim().length < 5) {
            return;
          }
          
          // Skip commands
          if (lastUserMessage.startsWith('/') || lastUserMessage.startsWith('!')) {
            return;
          }
          
          // 获取助手回复
          const assistantMessages = messages.filter(m => m.role === 'assistant');
          let lastAgentMessage = '';
          if (assistantMessages.length > 0) {
            const lastAssistant = assistantMessages[assistantMessages.length - 1];
            const content = lastAssistant.content;
            if (typeof content === 'string') {
              lastAgentMessage = content;
            } else if (Array.isArray(content)) {
              const textBlocks = content.filter((b: Record<string, unknown>) => b.type === 'text' && typeof b.text === 'string');
              if (textBlocks.length > 0) {
                lastAgentMessage = (textBlocks[0] as Record<string, unknown>).text as string;
              }
            }
          }
          
          // 关键词过滤：如果配置了关键词，只捕获包含关键词的对话
          const captureKeywords = config.captureKeywords || [];
          if (captureKeywords.length > 0) {
            const lowerUserMessage = (lastUserMessage || '').toLowerCase();
            const lowerAgentMessage = (lastAgentMessage || '').toLowerCase();
            const hasKeyword = captureKeywords.some((keyword: string) => 
              lowerUserMessage.includes(keyword.toLowerCase()) ||
              lowerAgentMessage.includes(keyword.toLowerCase())
            );
            if (!hasKeyword) {
              logger.info(`[autoCapture] No keyword matched, skipping. Keywords: ${captureKeywords.join(', ')}`);
              return;
            }
            logger.info(`[autoCapture] Keyword matched, capturing...`);
          }
          
          // Format content
          const content = `用户：${lastUserMessage}\n助手：${lastAgentMessage}`;
          
          // Generate embedding
          const vector = await ollama.embed(content);
          
          // Generate ID and payload
          const id = randomUUID();
          const payload = {
            content,
            user_message: lastUserMessage,
            agent_message: lastAgentMessage,
            agent_id: (event.agentId as string) || (event.agent as string) || 'unknown',
            session_id: (event.sessionId as string) || (event.session as string) || 'unknown',
            account_id: (event.accountId as string) || 'unknown',
            timestamp: new Date().toISOString(),
            auto_captured: true,
          };
          
          // Store to Qdrant
          await qdrant.upsert(config.collections.memory, [{ id, vector, payload }]);
          
          logger.info(`[autoCapture] Saved conversation to ${config.collections.memory}: ${id}`);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          logger.error(`[autoCapture] Error: ${message}`);
        }
      });
    }

    logger.info('[memory-qdrant] Plugin registered with config:', {
      qdrantUrl: config.qdrantUrl,
      ollamaUrl: config.ollamaUrl,
      autoCapture: config.autoCapture,
      autoRecall: config.autoRecall,
    });
  },
});