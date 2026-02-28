# 更新日志

本文档记录了 matchstick-solver-graph 项目的所有重要变更。

格式遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)，
版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

---

## [未发布]

---

## [v0.3] - 2026-02-28

### 新增
- ✨ **多数据库支持**：新增 AuraDB（Neo4j）作为可选图数据库
  - 实现数据库抽象层（`IGraphDatabase` 接口）
  - 创建 `FalkorDBAdapter` 和 `AuraDBAdapter` 适配器
  - 支持通过 `.env` 文件配置数据库类型
- 📝 **环境变量配置**：新增 `.env` 文件支持
  - 支持 `DB_TYPE`、`GRAPH_NAME`、`PORT` 等配置
  - FalkorDB 配置：`FALKORDB_URL`
  - AuraDB 配置：`AURADB_URI`、`AURADB_USERNAME`、`AURADB_PASSWORD`、`AURADB_DATABASE`
- 📦 **新增依赖**
  - `neo4j-driver`: Neo4j 官方驱动（用于 AuraDB）
  - `dotenv`: 环境变量加载

### 改进
- 🏗️ **架构重构**
  - 将 `GraphBuilder` 和 `MatchstickSolver` 从直接使用 Redis 客户端改为使用数据库适配器
  - 统一数据库查询接口，提高代码可维护性和可测试性
  - 更新测试文件 `check-graph.ts` 支持配置化数据库选择
- 📖 **文档更新**
  - 更新 README 中英文版，添加数据库选择说明
  - 创建 `.env.example` 模板文件

### 修复
- 🐛 **AuraDB 并发查询问题**
  - 修复 Neo4j Session 不支持并发事务导致的查询结果不完整问题
  - 为每个查询创建独立的 session，确保 `Promise.all` 并行查询正常工作
- 🐛 **Neo4j Integer 类型转换**
  - 修复 Neo4j 返回的 Integer 对象（`{low, high}`）未正确转换为 JavaScript number 的问题
  - 添加 `convertNeo4jValue` 方法处理 Neo4j 特殊类型（Integer、Date、DateTime、Point 等）

### 技术细节
- 数据库适配器统一返回格式：`{ data: any[][], metadata?: any }`
- 支持参数校验：AuraDB 配置缺失时抛出明确错误
- 配置打印：启动时显示当前数据库类型和连接信息（隐藏敏感数据）

---

## [v0.2] - 2026-02-19

### 新增
- 添加了三种新的2根火柴变换方式
  - `moveSubThenAdd`: 移动1根 + 移除1根 + 添加1根（净-1根）
  - `moveAddThenSub`: 移动1根 + 添加1根 + 移除1根（净+1根）
  - `removeRemoveAdd2`: 移除2根 + 添加2根（净0根）
- 前端新增搜索上限输入框（1000-500000节点）
- 前端新增过滤正负号按钮，可过滤包含前导符号的解
- 规则页面（移动2根模式）新增两列：
  - "移1减1根得到..." (moveSub)
  - "移1加1根得到..." (moveAdd)
- 新增测试用例：94-35=48 和 1+7=8+8

### 改进
- 优化过滤逻辑，仅过滤开头或等号后的正负号（如 +8=8, 1+7=+8）
- 调整过滤按钮位置至搜索上限同一行
- 更新 i18n 翻译（moveSub, moveAdd, filterSigns）
- parse-rules.ts 自动解析 markdown 规则表第9和第10列
- graph-builder.ts 自动创建 MOVE_SUB 和 MOVE_ADD 有向边

### 修复
- 修正过滤按钮误过滤所有含加减号的表达式问题

---

## [v0.1] - 2026-02-18
