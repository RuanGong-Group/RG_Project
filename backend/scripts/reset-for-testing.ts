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
    // 1. 删除学习记录
    const progress = await prisma.userLearningProgress.deleteMany({});
    console.log(`✅ 已清除 ${progress.count} 条学习进度`);
    
    // 2. 删除每日打卡记录
    const checkIns = await prisma.dailyCheckIn.deleteMany({});
    console.log(`✅ 已清除 ${checkIns.count} 条每日打卡记录`);
    
    // 3. 删除生词本
    const notebook = await prisma.userWordNotebook.deleteMany({});
    console.log(`✅ 已清除 ${notebook.count} 条生词本记录`);
    
    // 4. 删除词书乱序Salt（可选，会导致单词顺序重新乱序）
    const bookSettings = await prisma.userBookSettings.deleteMany({});
    console.log(`✅ 已清除 ${bookSettings.count} 条词书乱序设置`);
    
    // 5. 删除用户成就
    const achievements = await prisma.userAchievement.deleteMany({});
    console.log(`✅ 已清除 ${achievements.count} 条用户成就`);
    
    // 6. 删除视频生成任务
    const videos = await prisma.videoGenerationJob.deleteMany({});
    console.log(`✅ 已清除 ${videos.count} 条视频生成任务`);
    
    // 7. 重置用户的当前词书选择
    const users = await prisma.user.updateMany({
      data: { currentBookTagId: null }
    });
    console.log(`✅ 已重置 ${users.count} 个用户的当前词书`);
    
    console.log('\n🎉 学习进度已完全重置！单词数据保持不变。');
    console.log('💡 你可以继续使用现有单词进行测试。');
    console.log('📝 注意：词书乱序已重置，下次学习时单词顺序会重新生成。');
    
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
