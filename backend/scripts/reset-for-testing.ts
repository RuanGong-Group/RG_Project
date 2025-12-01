/**
 * 一键重置测试环境
 * 1. 清理所有学习进度（保留单词数据）
 * 2. 可选：清理所有数据并重新导入
 * 
 * 使用方式：
 *   仅重置学习进度：npx ts-node scripts/reset-for-testing.ts
 *   完全重置+重新导入：npx ts-node scripts/reset-for-testing.ts --full
 */

import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';

const prisma = new PrismaClient();

function parseArgs() {
  const args = process.argv.slice(2);
  return { full: args.includes('--full') };
}

async function resetProgressOnly() {
  console.log('🔄 重置学习进度（保留单词数据）...\n');
  
  try {
    // 只删除学习记录
    const progress = await prisma.userLearningProgress.deleteMany({});
    console.log(`✅ 已清除 ${progress.count} 条学习进度`);
    
    // 重置用户的 currentBookTagId（如果需要）
    const users = await prisma.user.updateMany({
      data: { currentBookTagId: null }
    });
    console.log(`✅ 已重置 ${users.count} 个用户的当前词书`);
    
    console.log('\n🎉 学习进度已重置！单词数据保持不变。');
    console.log('💡 你可以继续使用现有单词进行测试。');
    
  } catch (err) {
    console.error('❌ 重置失败：', err);
    throw err;
  }
}

async function fullReset() {
  console.log('🗑️  完全重置（清空所有数据+重新导入）...\n');
  
  try {
    // 1. 执行完全清理
    console.log('步骤 1/2: 清理数据库...');
    execSync('npx ts-node scripts/cleanup-all-test-data.ts -- --yes', { 
      stdio: 'inherit',
      cwd: process.cwd()
    });
    
    // 2. 重新导入测试数据
    console.log('\n步骤 2/2: 导入测试数据...');
    execSync('npx ts-node scripts/import-real-test-words.ts -- --bookName "四级核心词汇" --yes', {
      stdio: 'inherit',
      cwd: process.cwd()
    });
    
    console.log('\n🎉 完全重置完成！');
    
  } catch (err) {
    console.error('❌ 完全重置失败：', err);
    throw err;
  }
}

async function main() {
  const opts = parseArgs();
  
  console.log('════════════════════════════════════');
  console.log('  测试环境重置工具');
  console.log('════════════════════════════════════\n');
  
  try {
    if (opts.full) {
      await fullReset();
    } else {
      await resetProgressOnly();
    }
  } catch (err) {
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
