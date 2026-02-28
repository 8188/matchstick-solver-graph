import * as fs from 'fs';
import * as path from 'path';
import type { RuleSet, RuleCharacter } from './parse-rules.js';
import { IGraphDatabase } from './database';

/**
 * 图构建器（支持多种图数据库）
 * 从规则定义构建字符变换图
 */
export class GraphBuilder {
  constructor(private db: IGraphDatabase) {}
  
  /**
   * 连接到数据库
   */
  async connect(): Promise<void> {
    await this.db.connect();
  }
  
  /**
   * 断开数据库连接
   */
  async disconnect(): Promise<void> {
    await this.db.disconnect();
  }
  
  /**
   * 执行图查询
   */
  private async query(cypher: string): Promise<any> {
    try {
      const result = await this.db.query(cypher);
      return result;
    } catch (error: any) {
      console.error('Query error:', error.message);
      throw error;
    }
  }
  
  /**
   * 清除现有图
   */
  async clearGraph(): Promise<void> {
    await this.db.clearGraph();
  }
  
  /**
   * 创建索引以加快查询速度
   */
  async createIndexes(): Promise<void> {
    await this.db.createIndexes();
  }
  
  /**
   * 从规则集构建图
   */
  async buildGraph(): Promise<void> {
    const rulesDir = path.join(process.cwd(), 'backend', 'rules');
    
    // 加载两个规则集
    const standardRules: RuleSet = JSON.parse(
      fs.readFileSync(path.join(rulesDir, 'standard.json'), 'utf-8')
    );
    
    const handwrittenRules: RuleSet = JSON.parse(
      fs.readFileSync(path.join(rulesDir, 'handwritten.json'), 'utf-8')
    );
    
    // 为两种模式构建图
    await this.buildModeGraph(standardRules);
    await this.buildModeGraph(handwrittenRules);
    
    console.log('✅ Graph built successfully');
  }
  
  /**
   * 为单个模式构建图
   */
  private async buildModeGraph(ruleSet: RuleSet): Promise<void> {
    console.log(`\n🔨 Building ${ruleSet.mode} mode graph...`);
    
    // 创建字符节点
    for (const char of ruleSet.characters) {
      await this.createCharacterNode(char);
    }
    
    // 创建关系边
    for (const char of ruleSet.characters) {
      await this.createRelationships(char);
    }
    
    console.log(`   ✓ Created ${ruleSet.characters.length} nodes`);
  }
  
  /**
   * 创建字符节点
   */
  private async createCharacterNode(char: RuleCharacter): Promise<void> {
    const symbol = this.escapeString(char.character);
    
    const cypher = `
      MERGE (c:Character {
        symbol: '${symbol}',
        mode: '${char.mode}'
      })
      SET c.matchsticks = ${char.matchsticks},
          c.category = '${char.category}'
    `;
    
    await this.query(cypher);
  }
  
  /**
   * 创建变换关系
   */
  private async createRelationships(char: RuleCharacter): Promise<void> {
    const from = this.escapeString(char.character);
    const mode = char.mode;
    
    // MOVE_1关系（双向）
    for (const target of char.move1) {
      await this.createBidirectionalEdge(from, target, mode, 'MOVE_1');
    }
    
    // ADD_1关系（定向）
    for (const target of char.add1) {
      await this.createDirectionalEdge(from, target, mode, 'ADD_1');
    }
    
    // REMOVE_1关系（定向）
    for (const target of char.remove1) {
      await this.createDirectionalEdge(from, target, mode, 'REMOVE_1');
    }
    
    // MOVE_2关系（双向）
    for (const target of char.move2) {
      await this.createBidirectionalEdge(from, target, mode, 'MOVE_2');
    }
    
    // ADD_2关系（定向）
    for (const target of char.add2) {
      await this.createDirectionalEdge(from, target, mode, 'ADD_2');
    }
    
    // REMOVE_2关系（定向）
    for (const target of char.remove2) {
      await this.createDirectionalEdge(from, target, mode, 'REMOVE_2');
    }
    
    // MOVE_SUB 关系（定向，净-1）
    for (const target of char.moveSub) {
      await this.createDirectionalEdge(from, target, mode, 'MOVE_SUB');
    }
    
    // MOVE_ADD 关系（定向，净+1）
    for (const target of char.moveAdd) {
      await this.createDirectionalEdge(from, target, mode, 'MOVE_ADD');
    }
  }
  
  /**
   * 创建双向边（用于MOVE操作）
   */
  private async createBidirectionalEdge(
    from: string,
    to: string,
    mode: string,
    relType: string
  ): Promise<void> {
    const toEscaped = this.escapeString(to);
    
    const cypher = `
      MATCH (a:Character {symbol: '${from}', mode: '${mode}'})
      MATCH (b:Character {symbol: '${toEscaped}', mode: '${mode}'})
      MERGE (a)-[:${relType}]->(b)
      MERGE (b)-[:${relType}]->(a)
    `;
    
    await this.query(cypher);
  }
  
  /**
   * 创建定向边（用于ADD/REMOVE操作）
   */
  private async createDirectionalEdge(
    from: string,
    to: string,
    mode: string,
    relType: string
  ): Promise<void> {
    const toEscaped = this.escapeString(to);
    
    const cypher = `
      MATCH (a:Character {symbol: '${from}', mode: '${mode}'})
      MATCH (b:Character {symbol: '${toEscaped}', mode: '${mode}'})
      MERGE (a)-[:${relType}]->(b)
    `;
    
    await this.query(cypher);
  }
  
  /**
   * 为Cypher查询转义特殊字符
   */
  private escapeString(str: string): string {
    return str.replace(/'/g, "\\'");
  }
  
  /**
   * 获取图统计信息
   */
  async getStats(): Promise<void> {
    console.log('\n📊 Graph Statistics:');
    
    // 按模式统计节点
    const standardCount = await this.query(
      "MATCH (c:Character {mode: 'standard'}) RETURN count(c) as count"
    );
    console.log(`   Standard nodes: ${standardCount.data[0]?.[0] || 0}`);
    
    const handwrittenCount = await this.query(
      "MATCH (c:Character {mode: 'handwritten'}) RETURN count(c) as count"
    );
    console.log(`   Handwritten nodes: ${handwrittenCount.data[0]?.[0] || 0}`);
    
    // 统计关系
    const relCount = await this.query(
      "MATCH ()-[r]->() RETURN count(r) as count"
    );
    console.log(`   Total relationships: ${relCount.data[0]?.[0] || 0}`);
  }
}

/**
 * 主入口点
 */
async function main() {
  const { loadConfig, createDatabaseAdapter, printConfig } = await import('./config.js');
  
  const config = loadConfig();
  printConfig(config);
  
  const db = createDatabaseAdapter(config);
  const builder = new GraphBuilder(db);
  
  try {
    await builder.connect();
    await builder.clearGraph();
    await builder.buildGraph();
    await builder.createIndexes();
    await builder.getStats();
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await builder.disconnect();
  }
}

// 如果直接执行则运行
main();
