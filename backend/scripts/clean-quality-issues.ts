/**
 * 清理所有质量问题例句
 * 包括：填空题、多行内容、英文中含中文、中文括号、选项标记
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('════════════════════════════════════════════════════════════');
  console.log('🧹 清理质量问题例句');
  console.log('════════════════════════════════════════════════════════════\n');

  // 获取所有例句
  const allExamples = await prisma.examplePool.findMany({
    select: { id: true, sentence: true }
  });

  const toDelete: number[] = [];

  for (const ex of allExamples) {
    let shouldDelete = false;
    
    // 检查英文句子中是否包含中文
    if (/[\u4e00-\u9fa5]/.test(ex.sentence)) {
      shouldDelete = true;
    }
    
    // 检查是否有多行（可能是试卷格式）
    if (ex.sentence.includes('\n')) {
      shouldDelete = true;
    }
    
    // 检查是否有填空符号
    if (ex.sentence.includes('___') || ex.sentence.includes('____')) {
      shouldDelete = true;
    }
    
    // 检查是否有中文括号（注释）
    if (ex.sentence.includes('（') || ex.sentence.includes('）')) {
      shouldDelete = true;
    }
    
    // 检查是否有选项标记
    if (/\[[A-E]\]/.test(ex.sentence)) {
      shouldDelete = true;
    }
    
    if (shouldDelete) {
      toDelete.push(ex.id);
    }
  }

  console.log(`发现 ${toDelete.length} 条需要删除的例句\n`);

  // 批量删除
  let deleted = 0;
  for (const id of toDelete) {
    try {
      // 先删除关联
      await prisma.meaningExampleRelation.deleteMany({ where: { exampleId: id } });
      // 再删除例句
      await prisma.examplePool.delete({ where: { id } });
      deleted++;
      
      if (deleted % 50 === 0) {
        console.log(`  已删除 ${deleted}/${toDelete.length}...`);
      }
    } catch (e) {
      console.log(`  ⚠️ ID ${id} 删除失败`);
    }
  }

  console.log(`\n✅ 删除完成: ${deleted} 条\n`);

  // 检查缺少例句的义项
  console.log('📊 检查义项状态...');
  const meaningCount = await prisma.meaning.count({
    where: { examples: { none: {} } }
  });
  console.log(`   缺少例句的义项: ${meaningCount} 个`);

  if (meaningCount > 0) {
    console.log('\n⚠️ 需要运行 comprehensive-data-cleaning.ts 补充例句');
  }

  // 最终统计
  const finalExampleCount = await prisma.examplePool.count();
  const finalMeaningCount = await prisma.meaning.count();
  
  console.log('\n════════════════════════════════════════════════════════════');
  console.log('📊 清理后统计');
  console.log('════════════════════════════════════════════════════════════');
  console.log(`   例句总数: ${finalExampleCount}`);
  console.log(`   义项总数: ${finalMeaningCount}`);
  console.log(`   缺少例句的义项: ${meaningCount}`);

  await prisma.$disconnect();
}

main().catch(console.error);
