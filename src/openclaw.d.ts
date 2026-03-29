/**
 * OpenClaw Plugin SDK Type Definitions
 * 
 * 这些类型定义用于本地开发，实际运行时由 OpenClaw 提供
 */

declare module 'openclaw/plugin-sdk/plugin-entry' {
  import { Type } from '@sinclair/typebox';
  
  export interface ToolParameter {
    type: string;
    description?: string;
    default?: unknown;
    minimum?: number;
    maximum?: number;
    [key: string]: unknown;
  }
  
  export interface ToolDefinition {
    name: string;
    description: string;
    parameters: ReturnType<typeof Type.Object>;
    execute: (id: string, params: Record<string, unknown>) => Promise<ToolResult>;
  }
  
  export interface ToolResult {
    content: Array<{
      type: 'text';
      text: string;
    }>;
  }
  
  export interface AgentEndEvent {
    sessionId?: string;
    messages?: Array<{ role: string; content: string }>;
    [key: string]: unknown;
  }
  
  export interface PluginApi {
    id: string;
    name: string;
    version?: string;
    description?: string;
    pluginConfig: Record<string, unknown>;
    logger: {
      debug: (...args: unknown[]) => void;
      info: (...args: unknown[]) => void;
      warn: (...args: unknown[]) => void;
      error: (...args: unknown[]) => void;
    };
    registerTool: (tool: ToolDefinition, opts?: { optional?: boolean }) => void;
    registerHook: (event: string, handler: (context: Record<string, unknown>) => Promise<Record<string, unknown> | void>) => void;
    on: (event: string, handler: (event: Record<string, unknown>) => Promise<void>) => void;
  }
  
  export interface PluginEntry {
    id: string;
    name: string;
    description?: string;
    register: (api: PluginApi) => void;
  }
  
  export function definePluginEntry(entry: PluginEntry): PluginEntry;
}

declare module '@sinclair/typebox' {
  export namespace Type {
    export function String(opts?: { description?: string; default?: string }): ReturnType<typeof import('@sinclair/typebox').Type.String>;
    export function Number(opts?: { description?: string; default?: number; minimum?: number; maximum?: number }): ReturnType<typeof import('@sinclair/typebox').Type.Number>;
    export function Optional<T>(schema: T): T;
    export function Object(properties: Record<string, unknown>, opts?: { description?: string }): ReturnType<typeof import('@sinclair/typebox').Type.Object>;
    export function Record(keyType: unknown, valueType: unknown, opts?: { description?: string }): ReturnType<typeof import('@sinclair/typebox').Type.Record>;
    export function Unknown(): ReturnType<typeof import('@sinclair/typebox').Type.Unknown>;
  }
}