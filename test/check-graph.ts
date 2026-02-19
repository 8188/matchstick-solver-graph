/**
 * 检查图数据库中的数据
 */
import { createClient } from 'redis';

async function checkGraph() {
  const client = createClient({ url: 'redis://localhost:6379' });
  
  try {
    await client.connect();
    console.log('✅ 连接到FalkorDB\n');
    
    const graphName = 'matchstick';
    
    // 1. 检查节点总数
    console.log('📊 节点统计:');
    const totalNodes = await client.graph.query(
      graphName,
      'MATCH (c:Character) RETURN count(c) as count'
    );
    // FalkorDB返回格式: data = [[value1], [value2], ...]
    console.log(`   总节点数: ${totalNodes.data[0]?.[0] || 0}`);
    
    // 2. 按模式统计
    const standardNodes = await client.graph.query(
      graphName,
      "MATCH (c:Character {mode: 'standard'}) RETURN count(c) as count"
    );
    console.log(`   标准模式节点: ${standardNodes.data[0]?.[0] || 0}`);
    
    const handwrittenNodes = await client.graph.query(
      graphName,
      "MATCH (c:Character {mode: 'handwritten'}) RETURN count(c) as count"
    );
    console.log(`   手写模式节点: ${handwrittenNodes.data[0]?.[0] || 0}`);
    
    // 3. 查看标准模式的一些节点
    console.log('\n📝 标准模式样例节点:');
    const sampleStandard = await client.graph.query(
      graphName,
      "MATCH (c:Character {mode: 'standard'}) RETURN c.symbol, c.matchsticks, c.category LIMIT 10"
    );
    
    if (sampleStandard.data && sampleStandard.data.length > 0) {
      sampleStandard.data.forEach((row: any[]) => {
        console.log(`   字符: "${row[0]}" | 火柴数: ${row[1]} | 类别: ${row[2]}`);
      });
    }
    
    // 4. 查看手写模式的一些节点
    console.log('\n✍️  手写模式样例节点:');
    const sampleHandwritten = await client.graph.query(
      graphName,
      "MATCH (c:Character {mode: 'handwritten'}) RETURN c.symbol, c.matchsticks, c.category LIMIT 10"
    );
    
    if (sampleHandwritten.data && sampleHandwritten.data.length > 0) {
      sampleHandwritten.data.forEach((row: any[]) => {
        console.log(`   字符: "${row[0]}" | 火柴数: ${row[1]} | 类别: ${row[2]}`);
      });
    }
    
    // 5. 检查关系总数
    console.log('\n🔗 关系统计:');
    const totalRels = await client.graph.query(
      graphName,
      'MATCH ()-[r]->() RETURN count(r) as count'
    );
    console.log(`   总关系数: ${totalRels.data[0]?.[0] || 0}`);
    
    // 6. 按类型统计关系
    const relTypes = await client.graph.query(
      graphName,
      'MATCH ()-[r]->() RETURN type(r) as relType, count(r) as count ORDER BY count DESC'
    );
    
    if (relTypes.data && relTypes.data.length > 0) {
      console.log('\n   关系类型分布:');
      relTypes.data.forEach((row: any[]) => {
        console.log(`   ${row[0]}: ${row[1]}`);
      });
    }
    
    // 7. 测试特定字符的转换
    console.log('\n🔍 测试字符转换规则:');
    
    // 测试数字5的转换
    const transformsOf5 = await client.graph.query(
      graphName,
      "MATCH (c:Character {symbol: '5', mode: 'standard'})-[r:MOVE_1]->(target) RETURN target.symbol as target"
    );
    console.log(`   5 可以转换为 (MOVE_1): ${transformsOf5.data?.map((r: any[]) => r[0]).join(', ') || '无'}`);
    
    // 测试数字6的转换
    const transformsOf6 = await client.graph.query(
      graphName,
      "MATCH (c:Character {symbol: '6', mode: 'standard'})-[r:MOVE_1]->(target) RETURN target.symbol as target"
    );
    console.log(`   6 可以转换为 (MOVE_1): ${transformsOf6.data?.map((r: any[]) => r[0]).join(', ') || '无'}`);
    
    // 测试空格添加火柴
    const addsFromSpace = await client.graph.query(
      graphName,
      "MATCH (c:Character {symbol: ' ', mode: 'standard'})-[r:ADD_1]->(target) RETURN target.symbol as target"
    );
    console.log(`   空格可以添加1根得到 (ADD_1): ${addsFromSpace.data?.map((r: any[]) => r[0]).join(', ') || '无'}`);
    
    // 测试0添加火柴
    const addsFrom0 = await client.graph.query(
      graphName,
      "MATCH (c:Character {symbol: '0', mode: 'standard'})-[r:ADD_1]->(target) RETURN target.symbol as target"
    );
    console.log(`   0 可以添加1根得到 (ADD_1): ${addsFrom0.data?.map((r: any[]) => r[0]).join(', ') || '无'}`);
    
    // 测试8移除火柴
    const removesFrom8 = await client.graph.query(
      graphName,
      "MATCH (c:Character {symbol: '8', mode: 'standard'})-[r:REMOVE_1]->(target) RETURN target.symbol as target"
    );
    console.log(`   8 可以移除1根得到 (REMOVE_1): ${removesFrom8.data?.map((r: any[]) => r[0]).join(', ') || '无'}`);
    
    // 测试关键的MOVE_2和REMOVE_2规则
    console.log('\n🔥 标准模式关键规则检查:');
    
    const standardRules = [
      // 数字转换
      { from: '0', rel: 'MOVE_1', to: ['6', '9'], desc: '0可移动1根变为6或9' },
      { from: '0', rel: 'REMOVE_2', to: ['11'], desc: '0可移除2根变为11' },
      { from: '1', rel: 'ADD_2', to: ['4'], desc: '1可添加2根变为4' },
      { from: '1', rel: 'REMOVE_2', to: ['SPACE'], desc: '1可移除2根变为空格' },
      { from: '8', rel: 'REMOVE_2', to: ['2', '3', '5'], desc: '8可移除2根变为2/3/5' },
      { from: '3', rel: 'MOVE_1', to: ['2', '5'], desc: '3可移动1根变为2或5' },
      { from: '5', rel: 'MOVE_2', to: ['2'], desc: '5可移动2根变为2' },
      
      // 运算符转换
      { from: 'SPACE', rel: 'ADD_1', to: ['-'], desc: '空格可添加1根变为-' },
      { from: 'SPACE', rel: 'ADD_2', to: ['+', 'x', '/', '=', '1'], desc: '空格可添加2根变为运算符或1' },
      { from: '+', rel: 'MOVE_1', to: ['1', '='], desc: '+可移动1根变为1或=' },
      { from: '+', rel: 'REMOVE_1', to: ['-'], desc: '+可移除1根变为-' },
      { from: '-', rel: 'ADD_2', to: ['7'], desc: '-可添加2根变为7' },
    ];
    
    let passCount = 0;
    let failCount = 0;
    
    for (const rule of standardRules) {
      const result = await client.graph.query(
        graphName,
        `MATCH (c:Character {symbol: '${rule.from}', mode: 'standard'})-[r:${rule.rel}]->(target) RETURN target.symbol as target`
      );
      const targets = result.data?.map((r: any[]) => r[0]) || [];
      const hasAll = rule.to.every(t => targets.includes(t));
      const status = hasAll ? '✅' : '❌';
      
      if (hasAll) passCount++; else failCount++;
      
      console.log(`   ${status} ${rule.from} ${rule.rel} → ${targets.join(', ') || '无'}`);
      if (!hasAll) {
        const missing = rule.to.filter(t => !targets.includes(t));
        console.log(`      ⚠️  缺失: ${missing.join(', ')}`);
      }
    }
    
    console.log(`\n   标准模式规则检查: ${passCount}/${standardRules.length} 通过`);
    
    // 手写模式规则检查
    console.log('\n✍️  手写模式关键规则检查:');
    
    const handwrittenRules = [
      { from: '(0)H', rel: 'ADD_1', to: ['(6)H', '(9)H'], desc: '(0)H可添加1根变为(6)H或(9)H' },
      { from: '(1)H', rel: 'MOVE_1', to: ['-'], desc: '(1)H可移动1根变为-' },
      { from: '(1)H', rel: 'ADD_1', to: ['(7)H', '(11)H', '+'], desc: '(1)H可添加1根变为(7)H/(11)H/+' },
      { from: '(6)H', rel: 'MOVE_1', to: ['5', '(9)H'], desc: '(6)H可移动1根变为5或(9)H' },
      { from: '(9)H', rel: 'MOVE_1', to: ['3', '5', '(6)H'], desc: '(9)H可移动1根变为3/5/(6)H' },
      { from: '+', rel: 'MOVE_1', to: ['(7)H', '(11)H', '='], desc: '+可移动1根变为(7)H/(11)H/=' },
      { from: 'SPACE', rel: 'ADD_1', to: ['-', '(1)H'], desc: '空格可添加1根变为-或(1)H' },
      { from: 'SPACE', rel: 'ADD_2', to: ['x', '=', '+', '/', '(7)H', '(11)H'], desc: '空格可添加2根变为运算符' },
    ];
    
    let hwPassCount = 0;
    let hwFailCount = 0;
    
    for (const rule of handwrittenRules) {
      const result = await client.graph.query(
        graphName,
        `MATCH (c:Character {symbol: '${rule.from}', mode: 'handwritten'})-[r:${rule.rel}]->(target) RETURN target.symbol as target`
      );
      const targets = result.data?.map((r: any[]) => r[0]) || [];
      const hasAll = rule.to.every(t => targets.includes(t));
      const status = hasAll ? '✅' : '❌';
      
      if (hasAll) hwPassCount++; else hwFailCount++;
      
      console.log(`   ${status} ${rule.from} ${rule.rel} → ${targets.join(', ') || '无'}`);
      if (!hasAll) {
        const missing = rule.to.filter(t => !targets.includes(t));
        console.log(`      ⚠️  缺失: ${missing.join(', ')}`);
      }
    }
    
    console.log(`\n   手写模式规则检查: ${hwPassCount}/${handwrittenRules.length} 通过`);
    
    const totalPass = passCount + hwPassCount;
    const totalRules = standardRules.length + handwrittenRules.length;
    
    console.log('\n═══════════════════════════════════');
    console.log(`📊 总体规则检查: ${totalPass}/${totalRules} 通过`);
    console.log('═══════════════════════════════════');
    
    if (totalPass === totalRules) {
      console.log('\n✅ 所有规则检查通过！');
    } else {
      console.log(`\n⚠️  有 ${totalRules - totalPass} 个规则缺失`);
    }
    
  } catch (error) {
    console.error('❌ 错误:', error);
  } finally {
    await client.quit();
  }
}

checkGraph();
