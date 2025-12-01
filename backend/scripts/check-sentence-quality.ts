/**
 * 检查所有例句中的中文内容和其他质量问题
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('════════════════════════════════════════════════════════════');
  console.log('🔍 检查例句质量问题');
  console.log('════════════════════════════════════════════════════════════\n');

  // 获取所有例句
  const allExamples = await prisma.examplePool.findMany({
    select: { id: true, sentence: true, translation: true }
  });

  const problems: Array<{id: number, sentence: string, issues: string[]}> = [];

  for (const ex of allExamples) {
    const issues: string[] = [];
    
    // 检查英文句子中是否包含中文
    if (/[\u4e00-\u9fa5]/.test(ex.sentence)) {
      issues.push('英文中含中文');
    }
    
    // 检查是否有多行（可能是试卷格式）
    if (ex.sentence.includes('\n')) {
      issues.push('多行内容');
    }
    
    // 检查是否有填空符号
    if (ex.sentence.includes('___') || ex.sentence.includes('____')) {
      issues.push('填空题');
    }
    
    // 检查是否有中文括号（注释）
    if (ex.sentence.includes('（') || ex.sentence.includes('）')) {
      issues.push('中文括号');
    }
    
    // 检查是否有选项标记
    if (/\[[A-E]\]/.test(ex.sentence)) {
      issues.push('选项标记');
    }
    
    if (issues.length > 0) {
      problems.push({ id: ex.id, sentence: ex.sentence, issues });
    }
  }

  console.log(`发现 ${problems.length} 条有质量问题的例句\n`);

  // 按问题类型分组显示
  const grouped = new Map<string, Array<{id: number, sentence: string}>>();
  
  for (const p of problems) {
    const key = p.issues.join(', ');
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key)!.push({ id: p.id, sentence: p.sentence });
  }

  for (const [issueType, items] of grouped.entries()) {
    console.log(`【${issueType}】共 ${items.length} 条`);
    for (const item of items.slice(0, 10)) {
      console.log(`  ID ${item.id}: ${item.sentence.substring(0, 80)}${item.sentence.length > 80 ? '...' : ''}`);
    }
    if (items.length > 10) {
      console.log(`  ... 还有 ${items.length - 10} 条`);
    }
    console.log('');
  }

  console.log('════════════════════════════════════════════════════════════');
  console.log(`📊 汇总: ${problems.length} 条例句需要处理`);
  console.log('════════════════════════════════════════════════════════════');

  await prisma.$disconnect();
}

main().catch(console.error);
