import express from 'express';
import cors from 'cors';
import * as fs from 'fs/promises';
import * as path from 'path';
import { MatchstickSolver, type SolveOptions } from './solver.js';
import { RuleParser, type RuleSet } from './parse-rules.js';

const app = express();
const PORT = process.env.PORT || 8080;

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.static('frontend'));

// 初始化求解器
const solver = new MatchstickSolver();

/**
 * 健康检查端点
 */
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'matchstick-solver-graph' });
});

/**
 * 求解谜题端点
 * POST /api/solve
 * Body: { equation, mode, moveCount, maxSolutions }
 */
app.post('/api/solve', async (req, res) => {
  try {
    const { equation, mode = 'standard', moveCount = 1, maxSolutions = 100 } = req.body;
    
    // 验证输入
    if (!equation || typeof equation !== 'string') {
      return res.status(400).json({ error: 'Invalid equation' });
    }
    
    if (mode !== 'standard' && mode !== 'handwritten') {
      return res.status(400).json({ error: 'Mode must be "standard" or "handwritten"' });
    }
    
    if (moveCount !== 1 && moveCount !== 2) {
      return res.status(400).json({ error: 'moveCount must be 1 or 2' });
    }
    
    // 求解
    const options: SolveOptions = {
      equation,
      mode,
      moveCount,
      maxSolutions
    };
    
    const result = await solver.solve(options);
    
    res.json({
      success: true,
      input: equation,
      ...result
    });
    
  } catch (error: any) {
    console.error('Solve error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 获取指定模式的所有规则
 * GET /api/rules/:mode
 */
app.get('/api/rules/:mode', async (req, res) => {
  try {
    const { mode } = req.params;
    
    if (mode !== 'standard' && mode !== 'handwritten') {
      return res.status(400).json({ error: 'Invalid mode' });
    }
    
    const rulesFile = path.join(process.cwd(), 'backend', 'rules', `${mode}.json`);
    const rulesData = await fs.readFile(rulesFile, 'utf-8');
    const rules = JSON.parse(rulesData);
    
    res.json(rules);
  } catch (error: any) {
    console.error('Get rules error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * 保存规则到 Markdown 文件
 * POST /api/rules/:mode/save
 */
app.post('/api/rules/:mode/save', async (req, res) => {
  try {
    const { mode } = req.params;
    const { characters } = req.body;
    
    if (mode !== 'standard' && mode !== 'handwritten') {
      return res.status(400).json({ error: 'Invalid mode' });
    }
    
    if (!characters || !Array.isArray(characters)) {
      return res.status(400).json({ error: 'Invalid characters data' });
    }
    
    // 生成 Markdown 内容
    const mdContent = generateMarkdownFromRules(characters, mode);
    
    // 保存到 MD 文件
    const mdFile = mode === 'standard' 
      ? path.join(process.cwd(), 'doc', 'stantard-rules.md')
      : path.join(process.cwd(), 'doc', 'hand-written-rules.md');
    
    await fs.writeFile(mdFile, mdContent, 'utf-8');
    
    // 重新解析并保存 JSON
    RuleParser.parseAllRules();
    
    res.json({ 
      success: true, 
      message: '规则保存成功',
      file: mdFile
    });
    
  } catch (error: any) {
    console.error('Save rules error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * 获取指定字符在某模式下的转换规则
 * GET /api/rules/:mode/:character
 */
app.get('/api/rules/:mode/:character', async (req, res) => {
  try {
    const { mode, character } = req.params;
    
    if (mode !== 'standard' && mode !== 'handwritten') {
      return res.status(400).json({ error: 'Invalid mode' });
    }
    
    // 查询此字符的变换
    const cypher = `
      MATCH (c:Character {symbol: '${character.replace(/'/g, "\\'")}', mode: '${mode}'})
      OPTIONAL MATCH (c)-[r]->(target)
      RETURN c, type(r) as relType, target.symbol as targetSymbol
    `;
    
    // 这需要图客户端，暂时简化
    res.json({
      character,
      mode,
      message: '规则端点（图客户端查询待实现）'
    });
    
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * 根据规则数据生成 Markdown 表格内容
 */
function generateMarkdownFromRules(characters: any[], mode: string): string {
  const lines = [
    mode === 'standard' 
      ? '## 标准模式（七段式）火柴棒规则'
      : '## 手写模式火柴棒规则',
    '',
    '| 字符 | 火柴数 | 移动1根 | 添加1根 | 移除 1根 | 移动2根 | 添加2根 | 移除 2根 |',
    '|:-----:|:------:|:--------:|:--------:|:--------:|:--------:|:---------:|:--------:|'
  ];
  
  for (const char of characters) {
    const row = [
      char.character || '',
      char.matchsticks?.toString() || '0',
      (char.move1 || []).join(', '),
      (char.add1 || []).join(', '),
      (char.remove1 || []).join(', '),
      (char.move2 || []).join(', '),
      (char.add2 || []).join(', '),
      (char.remove2 || []).join(', ')
    ];
    
    lines.push(`| ${row.join(' | ')} |`);
  }
  
  return lines.join('\n') + '\n';
}

/**
 * 清除所有缓存
 * POST /api/cache/clear
 */
app.post('/api/cache/clear', (req, res) => {
  try {
    solver.clearAllCaches();
    res.json({ 
      success: true, 
      message: '所有缓存已清除' 
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * 获取缓存统计信息
 * GET /api/cache/stats
 */
app.get('/api/cache/stats', (req, res) => {
  try {
    const stats = solver.getCacheStats();
    res.json(stats);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * 启动服务器
 */
async function startServer() {
  try {
    // 连接到FalkorDB
    console.log('🔌 Connecting to FalkorDB...');
    await solver.connect();
    console.log('✅ Connected to FalkorDB');
    
    // 启动HTTP服务器
    app.listen(PORT, () => {
      console.log(`\n🚀 Server running on http://localhost:${PORT}`);
      console.log(`   API endpoint: http://localhost:${PORT}/api/solve`);
      console.log(`   Frontend: http://localhost:${PORT}/index.html`);
    });
    
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// 优雅处理关闭
process.on('SIGINT', async () => {
  console.log('\n\n👋 Shutting down...');
  await solver.disconnect();
  process.exit(0);
});

startServer();
