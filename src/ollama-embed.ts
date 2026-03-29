/**
 * Ollama Embedding Client - Generate embeddings using Ollama API
 */

import { request } from 'undici';

export class OllamaEmbedding {
  private baseUrl: string;
  private model: string;

  constructor(baseUrl: string = 'http://localhost:11434', model: string = 'bge-m3') {
    this.baseUrl = baseUrl;
    this.model = model;
  }

  /**
   * Generate embedding for text
   */
  async embed(text: string): Promise<number[]> {
    const response = await request(`${this.baseUrl}/api/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.model,
        prompt: text,
      }),
    });

    if (response.statusCode !== 200) {
      const body = await response.body.text();
      throw new Error(`Ollama embedding failed: ${response.statusCode} - ${body}`);
    }

    const data = await response.body.json() as { embedding: number[] };
    
    if (!data.embedding || !Array.isArray(data.embedding)) {
      throw new Error('Invalid embedding response from Ollama');
    }

    return data.embedding;
  }

  /**
   * Check if Ollama is healthy
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await request(`${this.baseUrl}/api/tags`);
      return response.statusCode === 200;
    } catch {
      return false;
    }
  }

  /**
   * Check if model is available
   */
  async isModelAvailable(): Promise<boolean> {
    try {
      const response = await request(`${this.baseUrl}/api/tags`);
      if (response.statusCode !== 200) return false;
      
      const data = await response.body.json() as { models: Array<{ name: string }> };
      const models = data.models || [];
      
      return models.some(m => m.name.includes(this.model));
    } catch {
      return false;
    }
  }
}