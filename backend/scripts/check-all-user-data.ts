import prisma from '../src/utils/prisma';

async function checkAllUserData() {
  console.log('=== 检查所有用户相关数据 ===\n');
  
  const counts = {
    userLearningProgress: await prisma.userLearningProgress.count(),
    dailyCheckIn: await prisma.dailyCheckIn.count(),
    userWordNotebook: await prisma.userWordNotebook.count(),
    userBookSettings: await prisma.userBookSettings.count(),
    userAchievement: await prisma.userAchievement.count(),
    videoGenerationJob: await prisma.videoGenerationJob.count(),
    user: await prisma.user.count(),
  };
  
  const tables = [
    { name: 'UserLearningProgress', count: counts.userLearningProgress, desc: '学习进度' },
    { name: 'DailyCheckIn', count: counts.dailyCheckIn, desc: '每日打卡' },
    { name: 'UserWordNotebook', count: counts.userWordNotebook, desc: '生词本' },
    { name: 'UserBookSettings', count: counts.userBookSettings, desc: '词书设置/乱序Salt' },
    { name: 'UserAchievement', count: counts.userAchievement, desc: '成就' },
    { name: 'VideoGenerationJob', count: counts.videoGenerationJob, desc: '视频生成任务' },
    { name: 'User', count: counts.user, desc: '用户账户' },
  ];
  
  for (const table of tables) {
    const status = table.count > 0 ? '⚠️ 有数据' : '✅ 空';
    console.log(`${status} ${table.name.padEnd(25)} (${table.desc.padEnd(15)}): ${table.count} 条记录`);
  }
  
  console.log('\n=== 需要清理的表 ===');
  console.log('测试环境重置时应清理以下表：');
  console.log('  1. UserLearningProgress   - 学习进度记录');
  console.log('  2. DailyCheckIn           - 每日打卡统计');
  console.log('  3. UserWordNotebook       - 生词本条目');
  console.log('  4. UserBookSettings       - 词书乱序Salt（如需重新乱序）');
  console.log('  5. UserAchievement        - 用户成就（可选）');
  console.log('  6. VideoGenerationJob     - 视频生成任务（可选）');
  console.log('\n保留的表：');
  console.log('  - User                    - 用户账户（除非完全重置）');
  console.log('  - Word, Meaning, Example  - 词库数据（必须保留）');
  console.log('  - BookTag, Relations      - 词书数据（必须保留）');
  
  await prisma.$disconnect();
}

checkAllUserData().catch(console.error);
