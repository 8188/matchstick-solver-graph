/**
 * 测试求解器 - 使用test.js中的所有案例
 */

interface TestResult {
  equation: string;
  expected: number;
  actual: number;
  success: boolean;
  solutions?: string[];
  error?: string;
}

// API基地址
const API_BASE = 'http://localhost:8080';

/**
 * 清除服务器端缓存
 */
async function clearServerCache(): Promise<void> {
  try {
    const response = await fetch(`${API_BASE}/api/cache/clear`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error('Failed to clear cache');
    }
    
    const result = await response.json();
    console.log('🧹 缓存已清除:', result);
  } catch (error: any) {
    throw new Error(`Clear cache error: ${error.message}`);
  }
}

/**
 * 获取缓存统计信息
 */
async function getCacheStats(): Promise<any> {
  try {
    const response = await fetch(`${API_BASE}/api/cache/stats`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error('Failed to get cache stats');
    }
    
    return await response.json();
  } catch (error: any) {
    throw new Error(`Get cache stats error: ${error.message}`);
  }
}

/**
 * 调用API求解
 */
async function solveEquation(
  equation: string, 
  mode: 'standard' | 'handwritten' = 'standard',
  moveCount: 1 | 2 = 1
): Promise<any> {
  try {
    const response = await fetch(`${API_BASE}/api/solve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        equation,
        mode,
        moveCount,
        maxSolutions: 100
      }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'API request failed');
    }
    
    return await response.json();
  } catch (error: any) {
    throw new Error(`API Error: ${error.message}`);
  }
}

/**
 * 运行单个测试
 */
async function runTest(
  equation: string,
  expectedSolutions: number,
  mode: 'standard' | 'handwritten' = 'standard',
  moveCount: 1 | 2 = 1
): Promise<TestResult> {
  try {
    const result = await solveEquation(equation, mode, moveCount);
    const actualCount = result.solutions?.length || 0;
    
    return {
      equation,
      expected: expectedSolutions,
      actual: actualCount,
      success: actualCount >= expectedSolutions, // 至少达到期望数量
      solutions: result.solutions?.map((s: any) => s.equation) || []
    };
  } catch (error: any) {
    return {
      equation,
      expected: expectedSolutions,
      actual: 0,
      success: false,
      error: error.message
    };
  }
}

/**
 * 主测试函数
 */
async function main() {
  const startTime = performance.now();
  console.log('🧪 开始测试求解器...\n');
  
  // 检查是否需要清除缓存（命令行参数）
  const shouldClearCache = process.argv.includes('--no-cache');
  
  if (shouldClearCache) {
    console.log('🧹 清除缓存中...');
    await clearServerCache();
    console.log('✅ 缓存已清除\n');
  } else {
    // 显示当前缓存状态
    try {
      const stats = await getCacheStats();
      console.log('📊 当前缓存状态:');
      console.log(`   - 转换缓存: ${stats.transformationCacheSize} 条`);
      console.log(`   - 验证缓存: ${stats.validationCacheSize} 条`);
      console.log('   💡 使用 --no-cache 参数可清除缓存测试真实速度\n');
    } catch (error) {
      console.log('⚠️  无法获取缓存状态（可能服务器未运行）\n');
    }
  }
  
  let totalPassed = 0;
  let totalFailed = 0;
  
  // ========== 标准模式 - 移动1根 ==========
  console.log('═══════════════════════════════════');
  console.log('📋 标准模式测试（移动1根）');
  console.log('═══════════════════════════════════\n');
  
  const standardTests: [string, number][] = [
    ['8+3-4=0', 2],   // 三数运算（+、-）
    ['6-5=17', 1],    // 减法
    ['5+7=2', 2],     // 加法
    ['6+4=4', 2],     // 加法
    ['9/3=2', 2],     // 除法（9/3=3可变为6/3=2）
    ['3*3=6', 3],     // 乘法（3*3=9可变为2*3=6或 3*2=6）
  ];
  
  for (const [equation, expected] of standardTests) {
    const result = await runTest(equation, expected, 'standard', 1);
    
    if (result.success) {
      totalPassed++;
      console.log(`✅ ${result.equation} - 期望${result.expected}解，得到${result.actual}解`);
      if (result.solutions && result.solutions.length > 0) {
        // 显示所有解
        result.solutions.forEach((sol, idx) => {
          console.log(`   解${idx + 1}: ${sol}`);
        });
      }
    } else {
      totalFailed++;
      console.log(`❌ ${result.equation} - 期望${result.expected}解，得到${result.actual}解`);
      if (result.error) {
        console.log(`   错误: ${result.error}`);
      } else if (result.solutions && result.solutions.length > 0) {
        result.solutions.forEach((sol, idx) => {
          console.log(`   解${idx + 1}: ${sol}`);
        });
      }
    }
  }
  
  // ========== 手写模式 - 移动1根 ==========
  console.log('\n═══════════════════════════════════');
  console.log('✍️  手写模式测试（移动1根）');
  console.log('═══════════════════════════════════\n');
  
  const handwrittenTests: [string, number][] = [
    ['(0)H+(6)H=(9)H', 3],
    ['2+(4)H=5', 1],
    ['(1)H+2=5', 2],
    ['(4)H+5=(9)H', 1],
    ['2*3=(9)H', 2],
    ['6/3=3', 2],
    ['(9)H+3-2=5', 1],
  ];
  
  for (const [equation, expected] of handwrittenTests) {
    const result = await runTest(equation, expected, 'handwritten', 1);
    
    if (result.success) {
      totalPassed++;
      console.log(`✅ ${result.equation} - 期望${result.expected}解，得到${result.actual}解`);
      if (result.solutions && result.solutions.length > 0) {
        result.solutions.forEach((sol, idx) => {
          console.log(`   解${idx + 1}: ${sol}`);
        });
      }
    } else {
      totalFailed++;
      console.log(`❌ ${result.equation} - 期望${result.expected}解，得到${result.actual}解`);
      if (result.error) {
        console.log(`   错误: ${result.error}`);
      } else if (result.solutions && result.solutions.length > 0) {
        result.solutions.forEach((sol, idx) => {
          console.log(`   解${idx + 1}: ${sol}`);
        });
      }
    }
  }
  
  // ========== 标准模式 - 移动2根 ==========
  console.log('\n═══════════════════════════════════');
  console.log('🔥 标准模式测试（移动2根）');
  console.log('═══════════════════════════════════\n');
  
  const doubleMoveTests: [string, number][] = [
    ['1+3=5', 3],
    ['5+2=8', 3],
    ['3-2=0', 3],
    ['6-4=3', 1],
    ['8-6=1', 4],
    ['5+5=8', 7],
    ['111+1=0', 4],
    ['64+98=11', 1],
    ['41+29=78', 6],
    ['79-39=17', 7],
    ['94-35=48', 1],
    ['1+7=8+8', 1],
  ];
  
  for (const [equation, expected] of doubleMoveTests) {
    const result = await runTest(equation, expected, 'standard', 2);
    
    if (result.success) {
      totalPassed++;
      console.log(`✅ ${result.equation} - 期望${result.expected}解，得到${result.actual}解`);
      if (result.solutions && result.solutions.length > 0) {
        result.solutions.forEach((sol, idx) => {
          console.log(`   解${idx + 1}: ${sol}`);
        });
      }
    } else {
      totalFailed++;
      console.log(`❌ ${result.equation} - 期望${result.expected}解，得到${result.actual}解`);
      if (result.error) {
        console.log(`   错误: ${result.error}`);
      } else if (result.solutions && result.solutions.length > 0) {
        result.solutions.forEach((sol, idx) => {
          console.log(`   解${idx + 1}: ${sol}`);
        });
      }
    }
  }
  
  // ========== 手写模式 - 移动2根 ==========
  console.log('\n═══════════════════════════════════');
  console.log('🔥 手写模式测试（移动2根）');
  console.log('═══════════════════════════════════\n');
  
  const handwrittenDoubleMoveTests: [string, number][] = [
    ['(1)H(1)H(1)H+(1)H=(0)H', 5],
    ['2+3=8', 4],
    ['(1)H+2=5', 2],
    ['(9)H+2=8', 1],
    ['5+(7)H=8', 1],
    ['2*3=5', 2],
    ['2*3=(6)H', 3],
  ];
  
  for (const [equation, expected] of handwrittenDoubleMoveTests) {
    const result = await runTest(equation, expected, 'handwritten', 2);
    
    if (result.success) {
      totalPassed++;
      console.log(`✅ ${result.equation} - 期望${result.expected}解，得到${result.actual}解`);
      if (result.solutions && result.solutions.length > 0) {
        result.solutions.forEach((sol, idx) => {
          console.log(`   解${idx + 1}: ${sol}`);
        });
      }
    } else {
      totalFailed++;
      console.log(`❌ ${result.equation} - 期望${result.expected}解，得到${result.actual}解`);
      if (result.error) {
        console.log(`   错误: ${result.error}`);
      } else if (result.solutions && result.solutions.length > 0) {
        result.solutions.forEach((sol, idx) => {
          console.log(`   解${idx + 1}: ${sol}`);
        });
      }
    }
  }
  
  // ========== 总结 ==========
  const totalTests = standardTests.length + handwrittenTests.length + 
                     doubleMoveTests.length + handwrittenDoubleMoveTests.length;
  
  const totalTime = performance.now() - startTime;
  
  console.log('\n═══════════════════════════════════');
  console.log(`📊 总测试结果: ${totalPassed}/${totalTests} 通过`);
  console.log(`⏱️  总执行时间: ${totalTime.toFixed(2)}ms`);
  console.log('═══════════════════════════════════');
  
  if (totalFailed > 0) {
    console.log(`\n❌ 失败: ${totalFailed}/${totalTests}`);
    process.exit(1);
  } else {
    console.log('\n🎉 所有测试通过！');
    process.exit(0);
  }
}

// 运行测试
main().catch(error => {
  console.error('❌ 测试运行失败:', error);
  process.exit(1);
});
