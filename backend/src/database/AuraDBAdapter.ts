import neo4j, { Driver, Session, Integer, isInt, isDate, isDateTime, isTime, isDuration, isPoint } from 'neo4j-driver';
import { IGraphDatabase, QueryResult, GraphStats } from './IGraphDatabase';

/**
 * AuraDB (Neo4j) 数据库适配器
 * 通过 Bolt 协议连接 Neo4j AuraDB
 * 
 * 注意：此适配器支持并发查询，每个 query() 调用使用独立的 session
 */
export class AuraDBAdapter implements IGraphDatabase {
  private driver: Driver | null = null;

  constructor(
    private uri: string,
    private username: string,
    private password: string,
    private database: string = 'neo4j'
  ) {}

  async connect(): Promise<void> {
    this.driver = neo4j.driver(
      this.uri,
      neo4j.auth.basic(this.username, this.password)
    );

    // 验证连接
    await this.driver.verifyConnectivity();
    console.log('✅ Connected to AuraDB (Neo4j)');
  }

  async disconnect(): Promise<void> {
    if (this.driver) {
      await this.driver.close();
      this.driver = null;
    }
  }

  /**
   * 将 Neo4j 特殊类型转换为原生 JavaScript 类型
   * Neo4j 驱动返回的 Integer、Date、DateTime 等需要特殊处理
   */
  private convertNeo4jValue(value: any): any {
    if (value === null || value === undefined) {
      return value;
    }
    
    // Neo4j Integer -> JavaScript number
    if (isInt(value)) {
      return (value as Integer).toNumber();
    }
    
    // Neo4j Date types
    if (isDate(value) || isDateTime(value) || isTime(value)) {
      return value.toString();
    }
    
    // Neo4j Duration
    if (isDuration(value)) {
      return value.toString();
    }
    
    // Neo4j Point
    if (isPoint(value)) {
      return { x: value.x, y: value.y, z: value.z, srid: value.srid };
    }
    
    // Neo4j Node or Relationship with properties
    if (value && typeof value === 'object' && value.properties) {
      const converted: any = {};
      for (const [key, val] of Object.entries(value.properties)) {
        converted[key] = this.convertNeo4jValue(val);
      }
      return converted;
    }
    
    // Array
    if (Array.isArray(value)) {
      return value.map(v => this.convertNeo4jValue(v));
    }
    
    // Plain object
    if (value && typeof value === 'object' && value.constructor === Object) {
      const converted: any = {};
      for (const [key, val] of Object.entries(value)) {
        converted[key] = this.convertNeo4jValue(val);
      }
      return converted;
    }
    
    // Primitive types (string, number, boolean)
    return value;
  }

  async query(cypher: string, params: any = {}): Promise<QueryResult> {
    if (!this.driver) {
      throw new Error('Database driver not initialized. Call connect() first.');
    }

    // 为每个查询创建独立的 session，支持并发执行
    const session = this.driver.session({ database: this.database });
    
    try {
      const result = await session.run(cypher, params);
      
      // 将 Neo4j 结果转换为统一格式，并处理所有 Neo4j 特殊类型
      const data = result.records.map(record => {
        return record.keys.map(key => {
          const value = record.get(key);
          return this.convertNeo4jValue(value);
        });
      });

      return {
        data,
        metadata: result.summary
      };
    } finally {
      // 确保 session 被关闭
      await session.close();
    }
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
      // Neo4j uses the new CREATE INDEX FOR syntax
      await this.query('CREATE INDEX character_symbol_index IF NOT EXISTS FOR (c:Character) ON (c.symbol)');
      console.log('📇 Created index on Character(symbol)');
    } catch (error: any) {
      console.log('📇 Index on Character(symbol) already exists or created');
    }
    
    try {
      await this.query('CREATE INDEX character_mode_index IF NOT EXISTS FOR (c:Character) ON (c.mode)');
      console.log('📇 Created index on Character(mode)');
    } catch (error: any) {
      console.log('📇 Index on Character(mode) already exists or created');
    }
  }
}
