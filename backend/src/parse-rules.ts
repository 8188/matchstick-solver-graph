import * as fs from 'fs';
import * as path from 'path';

export interface RuleCharacter {
  character: string;
  matchsticks: number;
  mode: 'standard' | 'handwritten';
  category: 'digit' | 'operator' | 'special';
  move1: string[];
  add1: string[];
  remove1: string[];
  move2: string[];
  add2: string[];
  remove2: string[];
}

export interface RuleSet {
  mode: 'standard' | 'handwritten';
  version: string;
  characters: RuleCharacter[];
}

/**
 * 将markdown表格规则解析为JSON格式
 */
export class RuleParser {
  
  /**
   * 解析单个markdown文件
   */
  static parseMarkdownFile(filePath: string, mode: 'standard' | 'handwritten'): RuleSet {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n').filter(line => line.trim());
    
    const characters: RuleCharacter[] = [];
    let inTable = false;
    
    for (const line of lines) {
      // 检测表格开始（标题行）
      if (line.includes('| Character | Matchsticks |')) {
        inTable = true;
        continue;
      }
      
      // 跳过分隔行
      if (line.includes('|:-----:|:------:|')) {
        continue;
      }
      
      // 解析数据行
      if (inTable && line.startsWith('|')) {
        const char = this.parseTableRow(line, mode);
        if (char) {
          characters.push(char);
        }
      }
    }
    
    return {
      mode,
      version: '1.0.0',
      characters
    };
  }
  
  /**
   * 解析单个表格行
   */
  private static parseTableRow(line: string, mode: 'standard' | 'handwritten'): RuleCharacter | null {
    const cells = line.split('|').map(cell => cell.trim());
    
    // 删除第一个和最后一个空单元格（来自前导/尾随|）
    if (cells[0] === '') cells.shift();
    if (cells[cells.length - 1] === '') cells.pop();
    
    if (cells.length < 8) {
      return null;
    }
    
    const character = cells[0];
    const matchsticks = parseInt(cells[1]);
    
    if (isNaN(matchsticks)) return null;
    
    // 确定类别
    let category: 'digit' | 'operator' | 'special';
    if (/^\d+$/.test(character) || /\(\d+\)H/i.test(character)) {
      category = 'digit';
    } else if (['+', '-', 'x', '/', '='].includes(character)) {
      category = 'operator';
    } else {
      category = 'special';
    }
    
    return {
      character,
      matchsticks,
      mode,
      category,
      move1: this.parseCell(cells[2]),
      add1: this.parseCell(cells[3]),
      remove1: this.parseCell(cells[4]),
      move2: this.parseCell(cells[5]),
      add2: this.parseCell(cells[6]),
      remove2: this.parseCell(cells[7])
    };
  }
  
  /**
   * 解析单元格中的逗号分隔值
   */
  private static parseCell(cell: string): string[] {
    if (!cell || cell === '') {
      return [];
    }
    // 按逗号分割并修剪每个值
    const values = cell.split(',').map(s => s.trim());
    // 保留所有非空值（包括'-'，这是一个有效字符）
    return values.filter(s => s !== '');
  }
  
  /**
   * 主入口点 - 解析两个规则文件
   */
  static parseAllRules(): void {
    const baseDir = path.resolve(process.cwd(), 'doc');
    
    // 解析标准规则
    const standardPath = path.join(baseDir, 'stantard-rules.md');
    const standardRules = this.parseMarkdownFile(standardPath, 'standard');
    
    // 解析手写规则
    const handwrittenPath = path.join(baseDir, 'hand-written-rules.md');
    const handwrittenRules = this.parseMarkdownFile(handwrittenPath, 'handwritten');
    
    // 创建规则目录
    const rulesDir = path.join(process.cwd(), 'backend', 'rules');
    if (!fs.existsSync(rulesDir)) {
      fs.mkdirSync(rulesDir, { recursive: true });
    }
    
    // 写入JSON文件
    fs.writeFileSync(
      path.join(rulesDir, 'standard.json'),
      JSON.stringify(standardRules, null, 2)
    );
    
    fs.writeFileSync(
      path.join(rulesDir, 'handwritten.json'),
      JSON.stringify(handwrittenRules, null, 2)
    );
    
    console.log('✅ Rules parsed successfully!');
    console.log(`   Standard mode: ${standardRules.characters.length} characters`);
    console.log(`   Handwritten mode: ${handwrittenRules.characters.length} characters`);
  }
}

// 如果直接执行则运行
RuleParser.parseAllRules();
