import prisma from '../src/utils/prisma';

async function checkDailyCheckIn() {
  console.log('=== 检查每日打卡数据 ===\n');
  
  const totalCheckIns = await prisma.dailyCheckIn.count();
  console.log(`📊 DailyCheckIn 总记录数: ${totalCheckIns}`);
  
  if (totalCheckIns > 0) {
    const allCheckIns = await prisma.dailyCheckIn.findMany({
      orderBy: { checkInDate: 'desc' },
      take: 10
    });
    
    console.log('\n最近10条打卡记录:');
    for (const checkIn of allCheckIns) {
      console.log(`  用户${checkIn.userId} - ${checkIn.checkInDate.toISOString().split('T')[0]}: 新学${checkIn.wordsLearned}, 复习${checkIn.wordsReviewed}`);
    }
  }
  
  await prisma.$disconnect();
}

checkDailyCheckIn().catch(console.error);
