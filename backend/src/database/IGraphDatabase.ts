/**
 * 图数据库统一接口
 * 定义了所有图数据库适配器必须实现的方法
 */
export interface IGraphDatabase {
  /**
   * 连接到数据库
   */
  connect(): Promise<void>;

  /**
   * 断开数据库连接
   */
  disconnect(): Promise<void>;

  /**
   * 执行 Cypher 查询
   * @param cypher Cypher 查询语句
   * @param params 查询参数（可选）
   * @returns 查询结果
   */
  query(cypher: string, params?: any): Promise<QueryResult>;

  /**
   * 清空图数据
   */
  clearGraph(): Promise<void>;

  /**
   * 获取图统计信息
   */
  getStats(): Promise<GraphStats>;

  /**
   * 创建索引以提升查询性能
   */
  createIndexes(): Promise<void>;
}

/**
 * 查询结果接口
 */
export interface QueryResult {
  data: any[][];
  metadata?: any;
}

/**
 * 图统计信息接口
 */
export interface GraphStats {
  nodeCount: number;
  relationshipCount: number;
  [key: string]: any;
}
