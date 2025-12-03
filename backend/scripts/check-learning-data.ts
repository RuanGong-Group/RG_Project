import prisma from '../src/utils/prisma';

async function checkLearningData() {
  console.log('=== 检查学习记录数据 ===\n');
  
  // 1. 检查学习进度记录总数
  const totalProgress = await prisma.userLearningProgress.count();
  console.log(`📊 UserLearningProgress 总记录数: ${totalProgress}`);
  
  if (totalProgress > 0) {
    // 2. 按用户统计
    const progressByUser = await prisma.userLearningProgress.groupBy({
      by: ['userId'],
      _count: true
    });
    console.log('\n按用户统计:');
    for (const p of progressByUser) {
      console.log(`  用户 ${p.userId}: ${p._count} 条记录`);
    }
    
    // 3. 显示最近5条记录
    const recentRecords = await prisma.userLearningProgress.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        meaning: {
          include: {
            word: true
          }
        }
      }
    });
    
    console.log('\n最近5条学习记录:');
    for (const record of recentRecords) {
      console.log(`  - 用户${record.userId}: ${record.meaning.word.word} (${record.meaning.definition?.substring(0, 30)}...) - 创建于 ${record.createdAt}`);
    }
    
    // 4. 检查今日学习数据
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayLearned = await prisma.userLearningProgress.count({
      where: {
        createdAt: { gte: today }
      }
    });
    
    const todayReviewed = await prisma.userLearningProgress.count({
      where: {
        lastReviewAt: { gte: today },
        reviewCount: { gt: 1 }
      }
    });
    
    console.log(`\n📅 今日数据:`);
    console.log(`  新学: ${todayLearned} 条`);
    console.log(`  复习: ${todayReviewed} 条`);
  }
  
  await prisma.$disconnect();
}

checkLearningData().catch(console.error);
