import { IGraphDatabase } from './database';

export interface SolveOptions {
  equation: string;
  mode: 'standard' | 'handwritten';
  moveCount: 1 | 2;
  maxSolutions?: number;
}

export interface Solution {
  equation: string;
  changes: Change[];
}

export interface Change {
  position: number;
  from: string;
  to: string;
  operation: string;
}

export interface SolveResult {
  solutions: Solution[];
  executionTime: number;
  candidatesExplored: number;
  method: string;
}

/**
 * MatchstickSolver — 基于图数据库的火柴棒求解器实现。
 * 提供：字符串分词、图查询（变换）、穷举验证和结果去重；包含本地缓存以提高性能。
 */
export class MatchstickSolver {
  private transformationCache = new Map<string, string[]>();
  private validationCache = new Map<string, boolean>();
  
  constructor(private db: IGraphDatabase) {}
  
  /**
   * 连接到数据库
   */
  async connect(): Promise<void> {
    await this.db.connect();
  }
  
  /**
   * 断开与数据库的连接
   */
  async disconnect(): Promise<void> {
    await this.db.disconnect();
  }
  
  /**
   * 清除本地缓存（transformationCache 与 validationCache）
   */
  clearAllCaches(): void {
    this.transformationCache.clear();
    this.validationCache.clear();
  }
  
  /**
   * 返回缓存统计信息（转换缓存与验证缓存的大小）
   */
  getCacheStats(): { transformationCacheSize: number; validationCacheSize: number } {
    return {
      transformationCacheSize: this.transformationCache.size,
      validationCacheSize: this.validationCache.size
    };
  }
  
  /**
   * 内部方法：通过图数据库执行 Cypher 查询
   */
  private async query(cypher: string, params: any = {}): Promise<any> {
    return await this.db.query(cypher, params);
  }
  
  /**
   * 主求解入口
   * 流程：规范化输入 → 生成分词变体 → 使用 MOVE_1 / MOVE_2 策略求解 → 去重/过滤 → 返回结果和统计信息
   */
  async solve(options: SolveOptions): Promise<SolveResult> {
    const startTime = performance.now();

    // 将手写标记中的小写 h 归一化为大写 H（例如 "(1)h" -> "(1)H"）
    const equation = (options.equation || '').replace(/(\(\d+\))h/gi, '$1H');

    // 清除上一次求解留下的验证缓存，准备开始本次求解流程
    this.validationCache.clear();

    // 生成分词变体（处理 '11' 的二义性）
    const tokenVariants = this.getAllTokenizeVariants(equation, options.mode);
    
    // 收集所有分词变体产生的候选解
    const allSolutions: Solution[] = [];
    let totalCandidatesExplored = 0;
    
    for (const tokens of tokenVariants) {
      if (options.moveCount === 1) {
        const results = await this.solveMove1(tokens, options.mode);
        allSolutions.push(...results.solutions);
        totalCandidatesExplored += results.candidatesExplored;
      } else {
        const results = await this.solveMove2(tokens, options.mode);
        allSolutions.push(...results.solutions);
        totalCandidatesExplored += results.candidatesExplored;
      }
    }
    
    // 对候选解进行去重
    const dedupedSolutions = this.dedup(allSolutions);
    
    // 过滤掉与原始等式等价或无效的解（保留真正的变换结果）
    const solutions = this.filterOriginal(dedupedSolutions, equation);
    
    // 根据 maxSolutions（若传入）限制返回的解的数量
    const limitedSolutions = options.maxSolutions 
      ? solutions.slice(0, options.maxSolutions)
      : solutions;
    
    const executionTime = performance.now() - startTime;
    
    return {
      solutions: limitedSolutions,
      executionTime,
      candidatesExplored: totalCandidatesExplored,
      method: 'Graph Database Query'
    };
  }
  
  /**
   * 生成所有可能的分词变体（解决连续 '1' 的二义性，例如 '111'）
   */
  private getAllTokenizeVariants(equation: string, mode: string): string[][] {
    const variants: string[][] = [];
    
    // 默认分词（优先识别 '11'）
    variants.push(this.tokenize(equation, mode));
    
    // 若存在连续的 '1'（例如 '111'），生成备用分词变体以覆盖边界歧义
    if (/1{3,}/.test(equation)) {
      // 使用备用分词策略以产生不同的分词边界
      const altTokens = this.tokenizeAlternative(equation, mode);
      const defaultStr = JSON.stringify(variants[0]);
      const altStr = JSON.stringify(altTokens);
      if (altStr !== defaultStr) {
        variants.push(altTokens);
      }
    }
    
    return variants;
  }
  
  /**
   * 备用分词策略：处理连续 '1' 的歧义（例如 '111'）
   */
  private tokenizeAlternative(equation: string, mode: string): string[] {
    const tokens: string[] = [];
    let i = 0;
    
    while (i < equation.length) {
      // 手写模式下优先识别 (11)H 与 (n)H
      if (mode === 'handwritten') {
        if (i + 5 <= equation.length && equation.substring(i, i + 5).match(/\(\d\d\)H/i)) {
          tokens.push(equation.substring(i, i + 5));
          i += 5;
          continue;
        }
        if (i + 4 <= equation.length && equation.substring(i, i + 4).match(/\(\d\)H/i)) {
          tokens.push(equation.substring(i, i + 4));
          i += 4;
          continue;
        }
      }
      
      // 处理连续 '1' 的特殊情况，改变切分边界以覆盖不同解析
      if (equation[i] === '1' && i + 1 < equation.length && equation[i + 1] === '1') {
        const nextNext = i + 2 < equation.length ? equation[i + 2] : '';
        if (nextNext === '1') {
          // 遇到 '111' 时，优先分割为 ['1','11']（作为一种变体）
          tokens.push('1');
          i++;
        } else {
          // 将 '11' 作为单一 token
          tokens.push('11');
          i += 2;
        }
      } else if (equation[i] !== ' ') {
        const ch = equation[i] === '*' || equation[i] === '×' ? 'x' : equation[i];
        tokens.push(ch);
        i++;
      } else {
        i++;
      }
    }
    
    return tokens;
  }
  
  /**
   * 处理移动一根火柴的所有变换（包括 MOVE_1、REMOVE_1、ADD_1 等）
   */
  private async solveMove1(
    tokens: string[],
    mode: string
  ): Promise<{ solutions: Solution[], candidatesExplored: number }> {
    const solutions: Solution[] = [];
    let candidatesExplored = 0;

    // 预取各 token 的变换结果，避免在内层循环中重复查询图数据库
    const move1Cache = new Map<string, string[]>();
    const remove1Cache = new Map<string, string[]>();
    const add1Cache = new Map<string, string[]>();
    const uniqueTokens = [...new Set(tokens)];
    await Promise.all(uniqueTokens.map(async t => {
      move1Cache.set(t, await this.getTransformations(t, mode, 'MOVE_1'));
      remove1Cache.set(t, await this.getTransformations(t, mode, 'REMOVE_1'));
      add1Cache.set(t, await this.getTransformations(t, mode, 'ADD_1'));
    }));
    // 提前获取 SPACE → ADD_1 结果（仅查询一次）
    const spaceAdd1 = await this.getTransformations(' ', mode, 'ADD_1');
    
    // 遍历每个 token，尝试其 MOVE_1 变换并验证方程是否成立
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      const transformations = move1Cache.get(token)!;
      
      for (const target of transformations) {
        const newTokens = [...tokens];
        newTokens[i] = target;
        
        candidatesExplored++;
        
        if (this.isValidEquation(newTokens)) {
          solutions.push({
            equation: newTokens.join(''),
            changes: [{
              position: i,
              from: token,
              to: target,
              operation: 'MOVE_1'
            }]
          });
        }
      }
    }
    
    // 尝试 REMOVE_1 + ADD_1 的组合变换：在一个位置移除一根，在另一个位置添加一根，然后验证方程是否成立
    for (let removeIdx = 0; removeIdx < tokens.length; removeIdx++) {
      const removeToken = tokens[removeIdx];
      const removals = remove1Cache.get(removeToken)!;
      
      for (const afterRemove of removals) {
        // 情形 2a：在位置 addIdx 上尝试 ADD_1 候选并验证
        for (let addIdx = 0; addIdx < tokens.length; addIdx++) {
          const addToken = tokens[addIdx];
          const additions = add1Cache.get(addToken)!;
          
          for (const afterAdd of additions) {
            const newTokens = [...tokens];
            newTokens[removeIdx] = afterRemove;
            newTokens[addIdx] = afterAdd;
            
            candidatesExplored++;
            
            const cleaned = newTokens.filter(t => t !== ' ' && t !== '');
            
            if (this.isValidEquation(cleaned)) {
              solutions.push({
                equation: cleaned.join(''),
                changes: [
                  { position: removeIdx, from: removeToken, to: afterRemove, operation: 'REMOVE_1' },
                  { position: addIdx, from: addToken, to: afterAdd, operation: 'ADD_1' }
                ]
              });
            }
          }
        }
        
        // 情形 2b：通过 SPACE 的 ADD_1 在任意插入位置添加新 token 并验证（spaceAdd1 已在循环外预取）
        for (const newToken of spaceAdd1) {
          // 构造插入后的 tokens 并进行验证
          for (let insertIdx = 0; insertIdx <= tokens.length; insertIdx++) {
            const newTokens = [...tokens];
            newTokens[removeIdx] = afterRemove;
            newTokens.splice(insertIdx, 0, newToken);
            
            candidatesExplored++;
            
            const cleaned = newTokens.filter(t => t !== ' ' && t !== '');
            
            if (this.isValidEquation(cleaned)) {
              solutions.push({
                equation: cleaned.join(''),
                changes: [
                  { position: removeIdx, from: removeToken, to: afterRemove, operation: 'REMOVE_1' },
                  { position: insertIdx, from: 'SPACE', to: newToken, operation: 'ADD_1' }
                ]
              });
            }
          }
        }
      }
    }
    
    return { solutions: this.dedup(solutions), candidatesExplored };
  }
  
  /**
   * 处理移动两根火柴的变换（包括 MOVE_2、REMOVE_2、ADD_2 等组合策略）
   */
  private async solveMove2(
    tokens: string[],
    mode: string
  ): Promise<{ solutions: Solution[], candidatesExplored: number }> {
    const solutions: Solution[] = [];
    let candidatesExplored = 0;
    
    // 先收集所有单步（MOVE_1）得到的解，用于后续去重（避免重复返回已由 MOVE_1 覆盖的解）
    const singleMoveSolutions = await this.solveMove1(tokens, mode);
    const singleMoveEquations = new Set(singleMoveSolutions.solutions.map(s => s.equation.replace(/ /g, '')));

    // 预取各 token 的变换结果，避免在内层循环中重复查询图数据库
    const uniqueTokens = [...new Set(tokens)];
    const move1Cache = new Map<string, string[]>();
    const remove1Cache = new Map<string, string[]>();
    const add1Cache = new Map<string, string[]>();
    const move2Cache = new Map<string, string[]>();
    const remove2Cache = new Map<string, string[]>();
    const add2Cache = new Map<string, string[]>();
    await Promise.all(uniqueTokens.map(async t => {
      move1Cache.set(t, await this.getTransformations(t, mode, 'MOVE_1'));
      remove1Cache.set(t, await this.getTransformations(t, mode, 'REMOVE_1'));
      add1Cache.set(t, await this.getTransformations(t, mode, 'ADD_1'));
      move2Cache.set(t, await this.getTransformations(t, mode, 'MOVE_2'));
      remove2Cache.set(t, await this.getTransformations(t, mode, 'REMOVE_2'));
      add2Cache.set(t, await this.getTransformations(t, mode, 'ADD_2'));
    }));
    // 提前获取 SPACE → ADD_1 / ADD_2 结果（仅查询一次）
    const spaceAdd1 = await this.getTransformations(' ', mode, 'ADD_1');
    const spaceAdd2 = await this.getTransformations(' ', mode, 'ADD_2');
    
    // 遍历每个 token，尝试 MOVE_2 变换并验证方程是否成立
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      const transformations = move2Cache.get(token) ?? [];
      
      for (const target of transformations) {
        const newTokens = [...tokens];
        newTokens[i] = target;
        
        candidatesExplored++;
        
        if (this.isValidEquation(newTokens)) {
          const eq = newTokens.join('').replace(/ /g, '');
          if (!singleMoveEquations.has(eq)) {
            solutions.push({
              equation: newTokens.join(''),
              changes: [{
                position: i,
                from: token,
                to: target,
                operation: 'MOVE_2'
              }]
            });
          }
        }
      }
    }
    
    // 尝试 REMOVE_2 + ADD_2 的组合变换（两根火柴移除/添加的情况）
    for (let removeIdx = 0; removeIdx < tokens.length; removeIdx++) {
      const removeToken = tokens[removeIdx];
      const removals = remove2Cache.get(removeToken) ?? [];
      
      for (const afterRemove of removals) {
        // 情形 2a：在已有位置执行移除并在其他位置添加两根火柴的组合
        for (let addIdx = 0; addIdx < tokens.length; addIdx++) {
          const addToken = tokens[addIdx];
          const additions = add2Cache.get(addToken) ?? [];
          
          for (const afterAdd of additions) {
            const newTokens = [...tokens];
            newTokens[removeIdx] = afterRemove;
            newTokens[addIdx] = afterAdd;
            
            candidatesExplored++;
            
            const cleaned = newTokens.filter(t => t !== ' ' && t !== '');
            
            if (this.isValidEquation(cleaned)) {
              const eq = cleaned.join('').replace(/ /g, '');
              if (!singleMoveEquations.has(eq)) {
                solutions.push({
                  equation: cleaned.join(''),
                  changes: [
                    { position: removeIdx, from: removeToken, to: afterRemove, operation: 'REMOVE_2' },
                    { position: addIdx, from: addToken, to: afterAdd, operation: 'ADD_2' }
                  ]
                });
              }
            }
          }
        }
        
        // 情形 2b：通过在任意插入位置添加（通过 SPACE 的 ADD_2）并验证结果（spaceAdd2 已预取）
        for (const newToken of spaceAdd2) {
          // 在插入位置构造新 tokens 并验证是否为合法等式
          for (let insertIdx = 0; insertIdx <= tokens.length; insertIdx++) {
            const newTokens = [...tokens];
            newTokens[removeIdx] = afterRemove;
            newTokens.splice(insertIdx, 0, newToken);
            
            candidatesExplored++;
            
            const cleaned = newTokens.filter(t => t !== ' ' && t !== '');
            
            if (this.isValidEquation(cleaned)) {
              const eq = cleaned.join('').replace(/ /g, '');
              if (!singleMoveEquations.has(eq)) {
                solutions.push({
                  equation: cleaned.join(''),
                  changes: [
                    { position: removeIdx, from: removeToken, to: afterRemove, operation: 'REMOVE_2' },
                    { position: insertIdx, from: 'SPACE', to: newToken, operation: 'ADD_2' }
                  ]
                });
              }
            }
          }
        }
      }
    }
    
    // 两次 MOVE_1 的组合（遍历 i, j 两个位置分别尝试 MOVE_1）
    for (let i = 0; i < tokens.length; i++) {
      const token1 = tokens[i];
      const transforms1 = move1Cache.get(token1) ?? [];
      
      for (const target1 of transforms1) {
        const intermediate = [...tokens];
        intermediate[i] = target1;
        
        for (let j = 0; j < intermediate.length; j++) {
          if (i === j) continue;
          
          const token2 = intermediate[j];
          // 对中间状态的 token2，若已缓存则复用，否则直接查询（中间状态可能含新 token）
          const transforms2 = move1Cache.get(token2) ?? await this.getTransformations(token2, mode, 'MOVE_1');
          
          for (const target2 of transforms2) {
            const newTokens = [...intermediate];
            newTokens[j] = target2;
            
            candidatesExplored++;
            
            if (this.isValidEquation(newTokens)) {
              const eq = newTokens.join('').replace(/ /g, '');
              if (!singleMoveEquations.has(eq)) {
                solutions.push({
                  equation: newTokens.join(''),
                  changes: [
                    { position: i, from: token1, to: target1, operation: 'MOVE_1' },
                    { position: j, from: token2, to: target2, operation: 'MOVE_1' }
                  ]
                });
              }
            }
          }
        }
      }
    }
    
    // 情形：两次 (REMOVE_1 + ADD_1) 的组合变换（在任意两个位置先移除再添加）
    // 外层遍历 i, j 作为第一次 REMOVE/ADD 的位置
    // 内层遍历 k, m 作为第二次 REMOVE/ADD 的位置
    for (let i = 0; i < tokens.length; i++) {
      const removals1 = remove1Cache.get(tokens[i]) ?? [];
      
      for (const afterRemove1 of removals1) {
        // 在位置 j 尝试第一次 ADD_1
        for (let j = 0; j < tokens.length; j++) {
          if (i === j) continue;
          
          const additions1 = add1Cache.get(tokens[j]) ?? [];
          
          for (const afterAdd1 of additions1) {
            // 构造一次中间状态并继续尝试第二次 REMOVE/ADD
            const intermediate = [...tokens];
            intermediate[i] = afterRemove1;
            intermediate[j] = afterAdd1;
            
            // 在中间状态上尝试第二次 REMOVE_1（索引 k）
            for (let k = 0; k < intermediate.length; k++) {
              const removals2 = remove1Cache.get(intermediate[k]) ?? await this.getTransformations(intermediate[k], mode, 'REMOVE_1');
              
              for (const afterRemove2 of removals2) {
                // 对中间状态上的位置 m 尝试第二次 ADD_1 并验证
                for (let m = 0; m < intermediate.length; m++) {
                  if (k === m) continue;
                  
                  const additions2 = add1Cache.get(intermediate[m]) ?? await this.getTransformations(intermediate[m], mode, 'ADD_1');
                  
                  for (const afterAdd2 of additions2) {
                    const newTokens = [...intermediate];
                    newTokens[k] = afterRemove2;
                    newTokens[m] = afterAdd2;
                    
                    candidatesExplored++;
                    
                    const cleaned = newTokens.filter(t => t !== ' ' && t !== '');
                    
                    if (this.isValidEquation(cleaned)) {
                      const eq = cleaned.join('').replace(/ /g, '');
                      if (!singleMoveEquations.has(eq)) {
                        solutions.push({
                          equation: cleaned.join(''),
                          changes: [
                            { position: i, from: tokens[i], to: afterRemove1, operation: 'REMOVE_1' },
                            { position: j, from: tokens[j], to: afterAdd1, operation: 'ADD_1' },
                            { position: k, from: intermediate[k], to: afterRemove2, operation: 'REMOVE_1' },
                            { position: m, from: intermediate[m], to: afterAdd2, operation: 'ADD_1' }
                          ]
                        });
                      }
                    }
                  }
                }
                
                // 尝试通过在中间状态插入 SPACE 并替换为候选 token 来模拟 ADD_1（spaceAdd1 已预取）
                for (const newToken of spaceAdd1) {
                  for (let insertIdx = 0; insertIdx <= intermediate.length; insertIdx++) {
                    const newTokens = [...intermediate];
                    newTokens[k] = afterRemove2;
                    newTokens.splice(insertIdx, 0, newToken);
                    
                    candidatesExplored++;
                    
                    const cleaned = newTokens.filter(t => t !== ' ' && t !== '');
                    
                    if (this.isValidEquation(cleaned)) {
                      const eq = cleaned.join('').replace(/ /g, '');
                      if (!singleMoveEquations.has(eq)) {
                        solutions.push({
                          equation: cleaned.join(''),
                          changes: [
                            { position: i, from: tokens[i], to: afterRemove1, operation: 'REMOVE_1' },
                            { position: j, from: tokens[j], to: afterAdd1, operation: 'ADD_1' },
                            { position: k, from: intermediate[k], to: afterRemove2, operation: 'REMOVE_1' },
                            { position: insertIdx, from: 'SPACE', to: newToken, operation: 'ADD_1' }
                          ]
                        });
                      }
                    }
                  }
                }
              }
            }
          }
        }
        
        // 情形：先 REMOVE_1 然后在任意位置通过 SPACE 执行 ADD_1（spaceAdd1 已预取）
        for (const newToken1 of spaceAdd1) {
          for (let insertIdx1 = 0; insertIdx1 <= tokens.length; insertIdx1++) {
            const intermediate = [...tokens];
            intermediate[i] = afterRemove1;
            intermediate.splice(insertIdx1, 0, newToken1);
            
            // 在插入后的中间数组上再次尝试 REMOVE_1
            for (let k = 0; k < intermediate.length; k++) {
              const removals2 = remove1Cache.get(intermediate[k]) ?? await this.getTransformations(intermediate[k], mode, 'REMOVE_1');
              
              for (const afterRemove2 of removals2) {
                // 对插入后的中间数组尝试第二次 ADD_1 并验证
                for (let m = 0; m < intermediate.length; m++) {
                  if (k === m) continue;
                  
                  const additions2 = add1Cache.get(intermediate[m]) ?? await this.getTransformations(intermediate[m], mode, 'ADD_1');
                  
                  for (const afterAdd2 of additions2) {
                    const newTokens = [...intermediate];
                    newTokens[k] = afterRemove2;
                    newTokens[m] = afterAdd2;
                    
                    candidatesExplored++;
                    
                    const cleaned = newTokens.filter(t => t !== ' ' && t !== '');
                    
                    if (this.isValidEquation(cleaned)) {
                      const eq = cleaned.join('').replace(/ /g, '');
                      if (!singleMoveEquations.has(eq)) {
                        solutions.push({
                          equation: cleaned.join(''),
                          changes: [
                            { position: i, from: tokens[i], to: afterRemove1, operation: 'REMOVE_1' },
                            { position: insertIdx1, from: 'SPACE', to: newToken1, operation: 'ADD_1' },
                            { position: k, from: intermediate[k], to: afterRemove2, operation: 'REMOVE_1' },
                            { position: m, from: intermediate[m], to: afterAdd2, operation: 'ADD_1' }
                          ]
                        });
                      }
                    }
                  }
                }
                
                // 再次尝试通过插入 SPACE 并替换为另一个 ADD_1 候选（spaceAdd1 已预取）
                for (const newToken2 of spaceAdd1) {
                  for (let insertIdx2 = 0; insertIdx2 <= intermediate.length; insertIdx2++) {
                    const newTokens = [...intermediate];
                    newTokens[k] = afterRemove2;
                    newTokens.splice(insertIdx2, 0, newToken2);
                    
                    candidatesExplored++;
                    
                    const cleaned = newTokens.filter(t => t !== ' ' && t !== '');
                    
                    if (this.isValidEquation(cleaned)) {
                      const eq = cleaned.join('').replace(/ /g, '');
                      if (!singleMoveEquations.has(eq)) {
                        solutions.push({
                          equation: cleaned.join(''),
                          changes: [
                            { position: i, from: tokens[i], to: afterRemove1, operation: 'REMOVE_1' },
                            { position: insertIdx1, from: 'SPACE', to: newToken1, operation: 'ADD_1' },
                            { position: k, from: intermediate[k], to: afterRemove2, operation: 'REMOVE_1' },
                            { position: insertIdx2, from: 'SPACE', to: newToken2, operation: 'ADD_1' }
                          ]
                        });
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
    
    // 组合：MOVE_1 + REMOVE_1 + ADD_1（先移动、再移除、再添加）
    for (let i = 0; i < tokens.length; i++) {
      const transforms = move1Cache.get(tokens[i]) ?? [];
      
      for (const afterTransform of transforms) {
        const step1 = [...tokens];
        step1[i] = afterTransform;
        
        for (let j = 0; j < step1.length; j++) {
          if (i === j) continue;
          
          const removals = remove1Cache.get(step1[j]) ?? await this.getTransformations(step1[j], mode, 'REMOVE_1');
          
          for (const afterRemove of removals) {
            const step2 = [...step1];
            step2[j] = afterRemove;
            
            // 构造候选 tokens 并验证
            for (let k = 0; k < step2.length; k++) {
              if (k === i || k === j) continue;
              
              const additions = add1Cache.get(step2[k]) ?? await this.getTransformations(step2[k], mode, 'ADD_1');
              
              for (const afterAdd of additions) {
                const newTokens = [...step2];
                newTokens[k] = afterAdd;
                
                candidatesExplored++;
                
                const cleaned = newTokens.filter(t => t !== ' ' && t !== '');
                
                if (this.isValidEquation(cleaned)) {
                  const eq = cleaned.join('').replace(/ /g, '');
                  if (!singleMoveEquations.has(eq)) {
                    solutions.push({
                      equation: cleaned.join(''),
                      changes: [
                        { position: i, from: tokens[i], to: afterTransform, operation: 'MOVE_1' },
                        { position: j, from: step1[j], to: afterRemove, operation: 'REMOVE_1' },
                        { position: k, from: step2[k], to: afterAdd, operation: 'ADD_1' }
                      ]
                    });
                  }
                }
              }
            }
            
            // 将 SPACE 替换为实际 token 并验证（spaceAdd1 已预取）
            for (const newToken of spaceAdd1) {
              for (let insertIdx = 0; insertIdx <= step2.length; insertIdx++) {
                const newTokens = [...step2];
                newTokens.splice(insertIdx, 0, newToken);
                
                candidatesExplored++;
                
                const cleaned = newTokens.filter(t => t !== ' ' && t !== '');
                
                if (this.isValidEquation(cleaned)) {
                  const eq = cleaned.join('').replace(/ /g, '');
                  if (!singleMoveEquations.has(eq)) {
                    solutions.push({
                      equation: cleaned.join(''),
                      changes: [
                        { position: i, from: tokens[i], to: afterTransform, operation: 'MOVE_1' },
                        { position: j, from: step1[j], to: afterRemove, operation: 'REMOVE_1' },
                        { position: insertIdx, from: 'SPACE', to: newToken, operation: 'ADD_1' }
                      ]
                    });
                  }
                }
              }
            }
          }
        }
      }
    }
    
    // 情形：MOVE_SUB + ADD_1 组合（"移动一根&移除一根" + 添加一根）
    // 注意：需要在规则图中有 MOVE_SUB 关系（移除并移动，净-1根火柴）
    const moveSubCache = new Map<string, string[]>();
    await Promise.all(uniqueTokens.map(async t => {
      moveSubCache.set(t, await this.getTransformations(t, mode, 'MOVE_SUB'));
    }));
    
    for (let i = 0; i < tokens.length; i++) {
      const moveSubTransforms = moveSubCache.get(tokens[i]) ?? [];
      
      for (const afterMoveSub of moveSubTransforms) {
        const step1 = [...tokens];
        step1[i] = afterMoveSub;
        
        // 在另一个位置尝试 ADD_1
        for (let j = 0; j < step1.length; j++) {
          if (i === j) continue;
          
          const additions = add1Cache.get(step1[j]) ?? await this.getTransformations(step1[j], mode, 'ADD_1');
          
          for (const afterAdd of additions) {
            const newTokens = [...step1];
            newTokens[j] = afterAdd;
            
            candidatesExplored++;
            
            const cleaned = newTokens.filter(t => t !== ' ' && t !== '');
            
            if (this.isValidEquation(cleaned)) {
              const eq = cleaned.join('').replace(/ /g, '');
              if (!singleMoveEquations.has(eq)) {
                solutions.push({
                  equation: cleaned.join(''),
                  changes: [
                    { position: i, from: tokens[i], to: afterMoveSub, operation: 'MOVE_SUB' },
                    { position: j, from: step1[j], to: afterAdd, operation: 'ADD_1' }
                  ]
                });
              }
            }
          }
        }
        
        // 尝试通过插入空格位置添加（spaceAdd1）
        for (const newToken of spaceAdd1) {
          for (let insertIdx = 0; insertIdx <= step1.length; insertIdx++) {
            const newTokens = [...step1];
            newTokens.splice(insertIdx, 0, newToken);
            
            candidatesExplored++;
            
            const cleaned = newTokens.filter(t => t !== ' ' && t !== '');
            
            if (this.isValidEquation(cleaned)) {
              const eq = cleaned.join('').replace(/ /g, '');
              if (!singleMoveEquations.has(eq)) {
                solutions.push({
                  equation: cleaned.join(''),
                  changes: [
                    { position: i, from: tokens[i], to: afterMoveSub, operation: 'MOVE_SUB' },
                    { position: insertIdx, from: 'SPACE', to: newToken, operation: 'ADD_1' }
                  ]
                });
              }
            }
          }
        }
      }
    }
    
    // 情形：MOVE_ADD + REMOVE_1 组合（"移动一根&添加一根" + 移除一根）
    const moveAddCache = new Map<string, string[]>();
    await Promise.all(uniqueTokens.map(async t => {
      moveAddCache.set(t, await this.getTransformations(t, mode, 'MOVE_ADD'));
    }));
    
    for (let i = 0; i < tokens.length; i++) {
      const moveAddTransforms = moveAddCache.get(tokens[i]) ?? [];
      
      for (const afterMoveAdd of moveAddTransforms) {
        const step1 = [...tokens];
        step1[i] = afterMoveAdd;
        
        // 在另一个位置尝试 REMOVE_1（提供火柴给 moveAdd 位置）
        for (let j = 0; j < step1.length; j++) {
          if (i === j) continue;
          
          const removals = remove1Cache.get(step1[j]) ?? await this.getTransformations(step1[j], mode, 'REMOVE_1');
          
          for (const afterRemove of removals) {
            const newTokens = [...step1];
            newTokens[j] = afterRemove;
            
            candidatesExplored++;
            
            const cleaned = newTokens.filter(t => t !== ' ' && t !== '');
            
            if (this.isValidEquation(cleaned)) {
              const eq = cleaned.join('').replace(/ /g, '');
              if (!singleMoveEquations.has(eq)) {
                solutions.push({
                  equation: cleaned.join(''),
                  changes: [
                    { position: i, from: tokens[i], to: afterMoveAdd, operation: 'MOVE_ADD' },
                    { position: j, from: step1[j], to: afterRemove, operation: 'REMOVE_1' }
                  ]
                });
              }
            }
          }
        }
      }
    }
    
    // 情形：REMOVE_1 + REMOVE_1 + ADD_2 组合（两次移除 + 一次添加两根）
    for (let i = 0; i < tokens.length; i++) {
      const removals1 = remove1Cache.get(tokens[i]) ?? [];
      
      for (const afterRemove1 of removals1) {
        const step1 = [...tokens];
        step1[i] = afterRemove1;
        
        // 在另一位置再次 REMOVE_1
        for (let j = 0; j < step1.length; j++) {
          if (i === j) continue;
          
          const removals2 = remove1Cache.get(step1[j]) ?? await this.getTransformations(step1[j], mode, 'REMOVE_1');
          
          for (const afterRemove2 of removals2) {
            const step2 = [...step1];
            step2[j] = afterRemove2;
            
            // 在第三个位置 ADD_2
            for (let k = 0; k < step2.length; k++) {
              if (k === i || k === j) continue;
              
              const additions2 = add2Cache.get(step2[k]) ?? await this.getTransformations(step2[k], mode, 'ADD_2');
              
              for (const afterAdd2 of additions2) {
                const newTokens = [...step2];
                newTokens[k] = afterAdd2;
                
                candidatesExplored++;
                
                const cleaned = newTokens.filter(t => t !== ' ' && t !== '');
                
                if (this.isValidEquation(cleaned)) {
                  const eq = cleaned.join('').replace(/ /g, '');
                  if (!singleMoveEquations.has(eq)) {
                    solutions.push({
                      equation: cleaned.join(''),
                      changes: [
                        { position: i, from: tokens[i], to: afterRemove1, operation: 'REMOVE_1' },
                        { position: j, from: step1[j], to: afterRemove2, operation: 'REMOVE_1' },
                        { position: k, from: step2[k], to: afterAdd2, operation: 'ADD_2' }
                      ]
                    });
                  }
                }
              }
            }
            
            // 尝试通过插入空格位置添加两根（spaceAdd2）
            for (const newToken of spaceAdd2) {
              for (let insertIdx = 0; insertIdx <= step2.length; insertIdx++) {
                const newTokens = [...step2];
                newTokens.splice(insertIdx, 0, newToken);
                
                candidatesExplored++;
                
                const cleaned = newTokens.filter(t => t !== ' ' && t !== '');
                
                if (this.isValidEquation(cleaned)) {
                  const eq = cleaned.join('').replace(/ /g, '');
                  if (!singleMoveEquations.has(eq)) {
                    solutions.push({
                      equation: cleaned.join(''),
                      changes: [
                        { position: i, from: tokens[i], to: afterRemove1, operation: 'REMOVE_1' },
                        { position: j, from: step1[j], to: afterRemove2, operation: 'REMOVE_1' },
                        { position: insertIdx, from: 'SPACE', to: newToken, operation: 'ADD_2' }
                      ]
                    });
                  }
                }
              }
            }
          }
        }
      }
    }
    
    return { solutions: this.dedup(solutions), candidatesExplored };
  }
  
  /**
   * 查询字符在图数据库中，指定关系类型（MOVE_1/ADD_1/REMOVE_1 等）下的所有目标字符
   * 返回值已做本地缓存以减少重复查询
   */
  private async getTransformations(
    symbol: string,
    mode: string,
    relType: string
  ): Promise<string[]> {
    const cacheKey = `${symbol}:${mode}:${relType}`;
    if (this.transformationCache.has(cacheKey)) {
      return this.transformationCache.get(cacheKey)!;
    }
    
    // 将真实空格在图数据库中使用 'SPACE' 表示，查询时需做映射
    const normalizedSymbol = symbol === ' ' ? 'SPACE' : symbol;
    const escapedSymbol = normalizedSymbol.replace(/'/g, "\\'");
    
    const cypher = `
      MATCH (a:Character {symbol: '${escapedSymbol}', mode: '${mode}'})-[:${relType}]->(b:Character)
      RETURN b.symbol as target
    `;
    
    try {
      const result = await this.query(cypher);
      // 图数据库返回的数据为二维数组（[[val1], [val2], ...]），第一列是 symbol
      const targets = result.data.map((row: any[]) => {
        const symbol = row[0];
        // 将数据库中的 'SPACE' 映射回实际的空格字符
        return symbol === 'SPACE' ? ' ' : symbol;
      });
      this.transformationCache.set(cacheKey, targets);
      return targets;
    } catch (error) {
      this.transformationCache.set(cacheKey, []);
      return [];
    }
  }
  
  /**
   * 将等式字符串切分为 tokens（支持标准与手写模式）
   */
  private tokenize(equation: string, mode: string): string[] {
    const tokens: string[] = [];
    let i = 0;
    
    while (i < equation.length) {
      // 手写模式下优先识别 (11)H 与 (n)H 标记
      if (mode === 'handwritten') {
        // 识别 '(11)H' 标记
        if (i + 5 <= equation.length && equation.substring(i, i + 5).match(/\(\d\d\)H/)) {
          tokens.push(equation.substring(i, i + 5));
          i += 5;
          continue;
        }
        
        // 识别 '(n)H' 这类手写标记
        if (i + 4 <= equation.length && equation.substring(i, i + 4).match(/\(\d\)H/)) {
          tokens.push(equation.substring(i, i + 4));
          i += 4;
          continue;
        }
      }
      
      // 识别连续 '11' 作为单一 token
      if (i + 2 <= equation.length && equation.substring(i, i + 2) === '11') {
        tokens.push('11');
        i += 2;
        continue;
      }
      
      // 将普通字符加入 token 列表（忽略空格）
      if (equation[i] !== ' ') {
        const ch = equation[i] === '*' || equation[i] === '×' ? 'x' : equation[i];
        tokens.push(ch);
      }
      i++;
    }
    
    return tokens;
  }
  
  /**
   * 验证给定 tokens 表示的等式是否为有效的数值等式
   */
  private isValidEquation(tokens: string[]): boolean {
    const expr = tokens.join('');
    const cacheKey = expr.replace(/ /g, '');
    
    // 缓存命中则直接返回
    if (this.validationCache.has(cacheKey)) {
      return this.validationCache.get(cacheKey)!;
    }
    
    // 不包含等号则不是有效等式
    if (!expr.includes('=')) {
      this.validationCache.set(cacheKey, false);
      return false;
    }
    
    // 规范化表达式（去除空格等）并排除非法运算符组合
    const normalized = expr.replace(/ /g, '');
    
    // 将 '=+' 或 '=-' 等特殊模式替换为占位（避免误判），然后检测连续非法运算符
    const withoutValidPatterns = normalized.replace(/=[\+\-]/g, '=N');
    
    // 若存在连续运算符（例如 '++'、'+*' 等），则视为非法表达式
    if (/[\+\-\*\/x=][\+\-\*\/x=]/.test(withoutValidPatterns)) {
      this.validationCache.set(cacheKey, false);
      return false;
    }
    
    try {
      // 准备执行求值：将 (n)H -> n，替换乘法符号为 '*'，替换除号为 '/'
      let evalExpr = expr
        .replace(/\(\d+\)H/gi, match => match.match(/\d+/)![0]) // (7)H 或 (7)h -> 7
        .replace(/x/g, '*')  // x -> *
        .replace(/÷/g, '/'); // ÷ -> /
      
      // 拆分为左右表达式并求值比较是否相等
      const parts = evalExpr.split('=');
      if (parts.length !== 2) {
        this.validationCache.set(cacheKey, false);
        return false;
      }
      
      // 计算左右两侧的数值
      const left = eval(parts[0]);
      const right = eval(parts[1]);
      
      // 比较左右结果的差值以判断等式是否成立
      const isValid = Math.abs(left - right) < 0.0001;
      this.validationCache.set(cacheKey, isValid);
      return isValid;
    } catch (error) {
      this.validationCache.set(cacheKey, false);
      return false;
    }
  }
  
  /**
   * 去重解集：根据等式字符串（去空格）判定唯一性
   */
  private dedup(solutions: Solution[]): Solution[] {
    const seen = new Set<string>();
    const unique: Solution[] = [];
    
    for (const sol of solutions) {
      const normalized = sol.equation.replace(/ /g, '');
      if (!seen.has(normalized)) {
        seen.add(normalized);
        unique.push(sol);
      }
    }
    
    return unique;
  }
  
  /**
   * 过滤掉与原始等式等价的解（不返回无变化或等价解）
   */
  private filterOriginal(solutions: Solution[], originalEquation: string): Solution[] {
    const normalizedOriginal = originalEquation.replace(/ /g, '').replace(/\*/g, 'x').replace(/×/g, 'x');
    return solutions.filter(sol => {
      const normalized = sol.equation.replace(/ /g, '');
      return normalized !== normalizedOriginal;
    });
  }
}
