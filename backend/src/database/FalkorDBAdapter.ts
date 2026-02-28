import { createClient } from 'redis';
import { IGraphDatabase, QueryResult, GraphStats } from './IGraphDatabase';

/**
 * FalkorDB 数据库适配器
 * 通过 Redis 协议连接 FalkorDB/RedisGraph
 */
export class FalkorDBAdapter implements IGraphDatabase {
  private client: any;
  private graphName: string;

  constructor(
    private redisUrl: string,
    graphName: string = 'matchstick'
  ) {
    this.graphName = graphName;
  }

  async connect(): Promise<void> {
    this.client = createClient({ url: this.redisUrl });
    
    this.client.on('error', (err: Error) => {
      console.error('Redis Client Error:', err);
    });
    
    await this.client.connect();
    console.log('✅ Connected to FalkorDB');
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.quit();
    }
  }

  async query(cypher: string, params: any = {}): Promise<QueryResult> {
    const result = await this.client.graph.query(this.graphName, cypher, { params });
    return {
      data: result.data || [],
      metadata: result.metadata
    };
  }

  async clearGraph(): Promise<void> {
    try {
      await this.query('MATCH (n) DETACH DELETE n');
      console.log('🗑️  Cleared existing graph data');
    } catch (error) {
      console.log('ℹ️  No existing graph to clear (this is normal on first run)');
    }
  }

  async getStats(): Promise<GraphStats> {
    const nodeResult = await this.query('MATCH (n) RETURN count(n) as count');
    const relResult = await this.query('MATCH ()-[r]->() RETURN count(r) as count');
    
    const nodeCount = nodeResult.data[0]?.[0] || 0;
    const relationshipCount = relResult.data[0]?.[0] || 0;

    return {
      nodeCount,
      relationshipCount
    };
  }

  async createIndexes(): Promise<void> {
    try {
      // FalkorDB uses the old CREATE INDEX ON syntax
      await this.query('CREATE INDEX ON :Character(symbol)');
      console.log('📇 Created index on Character(symbol)');
    } catch (error: any) {
      if (error.message && (error.message.includes('already indexed') || error.message.includes('already exists'))) {
        console.log('📇 Index on Character(symbol) already exists');
      } else {
        console.warn('⚠️  Warning creating index on symbol:', error.message);
      }
    }
    
    try {
      await this.query('CREATE INDEX ON :Character(mode)');
      console.log('📇 Created index on Character(mode)');
    } catch (error: any) {
      if (error.message && (error.message.includes('already indexed') || error.message.includes('already exists'))) {
        console.log('📇 Index on Character(mode) already exists');
      } else {
        console.warn('⚠️  Warning creating index on mode:', error.message);
      }
    }
  }
}
