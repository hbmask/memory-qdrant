/**
 * Qdrant Client - HTTP client for Qdrant API
 */

import { request } from 'undici';

export interface QdrantPoint {
  id: string;
  vector: number[];
  payload: Record<string, unknown>;
}

export interface SearchResult {
  id: string;
  score: number;
  payload: Record<string, unknown>;
}

export class QdrantClient {
  private baseUrl: string;

  constructor(baseUrl: string = 'http://localhost:6333') {
    this.baseUrl = baseUrl;
  }

  /**
   * Upsert points to a collection
   */
  async upsert(collection: string, points: QdrantPoint[]): Promise<boolean> {
    const response = await request(`${this.baseUrl}/collections/${collection}/points`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ points }),
    });

    if (response.statusCode !== 200) {
      const body = await response.body.text();
      throw new Error(`Qdrant upsert failed: ${response.statusCode} - ${body}`);
    }

    return true;
  }

  /**
   * Search similar vectors
   */
  async search(collection: string, vector: number[], limit: number = 5): Promise<SearchResult[]> {
    const response = await request(`${this.baseUrl}/collections/${collection}/points/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vector, limit }),
    });

    if (response.statusCode !== 200) {
      const body = await response.body.text();
      throw new Error(`Qdrant search failed: ${response.statusCode} - ${body}`);
    }

    const data = await response.body.json() as { result: SearchResult[] };
    return data.result || [];
  }

  /**
   * Delete points by IDs
   */
  async delete(collection: string, ids: string[]): Promise<boolean> {
    const response = await request(`${this.baseUrl}/collections/${collection}/points/delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ points: ids }),
    });

    if (response.statusCode !== 200) {
      const body = await response.body.text();
      throw new Error(`Qdrant delete failed: ${response.statusCode} - ${body}`);
    }

    return true;
  }

  /**
   * Get collection info
   */
  async getCollectionInfo(collection: string): Promise<unknown> {
    const response = await request(`${this.baseUrl}/collections/${collection}`);

    if (response.statusCode !== 200) {
      return null;
    }

    return await response.body.json();
  }

  /**
   * Check if Qdrant is healthy
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await request(`${this.baseUrl}/health`);
      return response.statusCode === 200;
    } catch {
      return false;
    }
  }
}