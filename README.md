# 火柴棒等式求解器 Graph 版 

[ 中文](#) | [ English](./README.en.md)

**Version: v0.3**

---

基于**图数据库**的高性能火柴棒等式求解工具，是 [matchstick-puzzle-solver](https://github.com/8188/matchstick-puzzle-solver) 的升级版。将字符变换规则建模为图，通过 Cypher 查询代替穷举搜索，大幅提升求解效率和可扩展性。

**现已支持双数据库选择：**
- **FalkorDB**：轻量级 Redis 图数据库
- **AuraDB**：Neo4j 云原生图数据库

## 特性

-  🗄️  **双数据库支持**：灵活选择 FalkorDB 或 AuraDB（Neo4j）作为图存储引擎
-  🔀  **双模式支持**：标准七段码模式 + 手写模式（`(n)H` 语法）
-  ✏️  **自定义规则**：支持在线编辑并写回图数据库
-  🔧  **移动选择**：支持移动 1 根或 2 根火柴
-  🎨  **SVG 实时渲染**：输入即显示火柴棒等式预览
-  ⚙️  **高级语法**：支持 `=+`、`=-`、前导正负号等表达式

## 快速开始

### 前置依赖

- Node.js 18+
- 以下数据库之一：
  - **FalkorDB**（推荐本地开发）
  - **AuraDB**（Neo4j 云服务）

### 数据库选择

#### 选项 1: 使用 FalkorDB（本地）

```bash
# 启动 FalkorDB
docker run -p 6379:6379 -it --rm falkordb/falkordb:latest
```

#### 选项 2: 使用 AuraDB（云端）

1. 访问 [Neo4j AuraDB](https://neo4j.com/product/aura/) 创建免费实例
2. 获取连接信息（URI、用户名、密码）

### 安装与配置

```bash
git clone <repo-url>
cd matchstick-solver-graph

# 安装依赖
npm install

# 配置数据库
cp .env.example .env
# 编辑 .env 文件，选择数据库类型并填写连接信息
```

### 初始化与运行

```bash
# 初始化图数据（仅首次或规则更新后）
npm run init-graph

# 启动后端服务（默认端口 8080）
npm run dev

# 前端：直接用浏览器打开 frontend/index.html，或启动静态服务
npx http-server frontend -p 3000
```

然后访问：`http://localhost:3000/index.html`

## 项目结构

```
matchstick-solver-graph/
 backend/
    src/
        database/                 # 数据库适配器层
           IGraphDatabase.ts      # 统一接口
           FalkorDBAdapter.ts     # FalkorDB 实现
           AuraDBAdapter.ts       # AuraDB 实现
        config.ts                 # 配置管理（.env 支持）
        solver.ts                 # 核心求解器
        index.ts                  # Express API 服务器
        graph-builder.ts          # 图数据初始化
        parse-rules.ts            # 规则解析工具
 frontend/
    index.html                    # 主页面
    rules.html                    # 规则查看页
    js/
       app.js                     # 主应用控制器
       i18n.js                    # 国际化
    styles/
        main.css                  # 全局样式
        components.css            # 组件样式
        animations.css            # 动画
 test/
    test-solver.ts                # 集成测试
    check-graph.ts                # 图数据校验
 .env.example                     # 环境变量模板
 package.json
```

## API 文档

| 方法 | 路径 | 说明 |
|------|------|------|
| `POST` | `/api/solve` | 求解等式 |
| `GET` | `/api/rules/:mode` | 获取变换规则 |
| `POST` | `/api/cache/clear` | 清除服务端缓存 |
| `GET` | `/api/cache/stats` | 查看缓存统计 |

**求解请求示例：**

```json
POST /api/solve
{
  "equation": "8+3-4=0",
  "mode": "standard",
  "moveCount": 1,
  "maxSolutions": 100
}
```

## 测试

>  测试需要后端服务和 FalkorDB 同时运行

```bash
npm test

# 清除缓存后测试真实查询速度
npm test -- --no-cache
```

## 与 matchstick-puzzle-solver 的对比

| 特性 | matchstick-puzzle-solver | matchstick-solver-graph |
|------|--------------------------|-------------------------|
| 架构 | 纯前端，规则内存存储 | 前后端分离，图数据库 |
| 数据库 | 无 | FalkorDB / AuraDB 可选 |
| 规则存储 | JS 对象 | 图节点/边 |
| 查询方式 | 穷举 + 剪枝 | Cypher 图查询 |
| 可扩展性 | 有限 | 高（动态添加规则） |
| 配置方式 | 硬编码 | .env 环境变量 |
| 部署复杂度 | 极低（静态页面） | 中（需要数据库） |
| 测试方式 | 纯前端 node 脚本 | HTTP API 集成测试 |

### 性能说明

**FalkorDB** 表现最佳，支持真正的并发查询，延迟极低，是本地开发和测试的首选。

**AuraDB** 虽然功能完全相同，但由于 Neo4j 的会话管理限制和网络延迟，查询速度相对 FalkorDB 慢很多。尽管如此，AuraDB 仍比原始的 matchstick-puzzle-solver 版本快很多倍，优势在于可扩展性和云部署的便利性。

##  TODO List

- [ ] **谜题生成器**: 自动生成不同难度的火柴棒谜题
- [ ] **提示系统**: 为用户提供分步提示
- [ ] **难度分级**: 根据移动次数和解的数量自动评估难度
- [ ] **分享功能**: 生成谜题链接，方便分享给好友
- [ ] **增加测试用例**: 扩展集成与边界情况的覆盖
- [ ] **探索新玩法**: 设计新的谜题变体与规则集合
- [ ] **继续美化前端**: 改进视觉设计与响应式体验
- [ ] **考虑出 app 版本**: 评估移动/桌面封装发布的可行性

## 更新日志

查看更新日志：[doc/CHANGELOG.md](doc/CHANGELOG.md)

## 截图

![index screenshot](frontend/assets/images/index.png)

## 许可证

MIT License

## 致谢

- 图数据库支持：
  - [FalkorDB](https://github.com/FalkorDB/FalkorDB) - Redis 图数据库
  - [Neo4j AuraDB](https://neo4j.com/product/auradb/) - 云原生图数据库

---
