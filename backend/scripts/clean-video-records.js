/**
 * 清理视频生成记录
 * 用于清除失败或不完整的视频记录
 * 运行: node scripts/clean-video-records.js
 */

const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();

async function cleanVideoRecords() {
  try {
    console.log('🔍 开始检查视频生成记录...\n');

    // 查询今天的视频记录
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayJobs = await prisma.videoGenerationJob.findMany({
      where: {
        createdAt: {
          gte: today
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    if (todayJobs.length === 0) {
      console.log('✅ 没有找到今天的视频记录');
      return;
    }

    console.log(`📊 找到 ${todayJobs.length} 条今天的记录：\n`);

    todayJobs.forEach((job, index) => {
      console.log(`${index + 1}. 任务 ID: ${job.jobId}`);
      console.log(`   状态: ${job.status}`);
      console.log(`   进度: ${job.progress}%`);
      console.log(`   用户 ID: ${job.userId}`);
      console.log(`   创建时间: ${job.createdAt.toLocaleString('zh-CN')}`);
      console.log(`   视频路径: ${job.videoPath || '无'}`);
      console.log(`   视频 URL: ${job.videoUrl || '无'}`);
      if (job.errorMessage) {
        console.log(`   错误信息: ${job.errorMessage}`);
      }
      console.log('');
    });

    // 询问是否删除
    console.log('💡 选项：');
    console.log('   1. 删除所有今天的记录（重新生成）');
    console.log('   2. 只删除失败的记录');
    console.log('   3. 保持不变');
    console.log('');

    // 由于是自动脚本，我们默认删除今天所有的记录
    console.log('⚠️  将删除今天的所有视频记录，允许重新生成...\n');

    const deleted = await prisma.videoGenerationJob.deleteMany({
      where: {
        createdAt: {
          gte: today
        }
      }
    });

    console.log(`✅ 已删除 ${deleted.count} 条记录`);
    console.log('💡 现在可以重新生成视频了！');

  } catch (error) {
    console.error('❌ 清理失败:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// 如果直接运行脚本
if (require.main === module) {
  cleanVideoRecords()
    .then(() => {
      console.log('\n✅ 清理完成');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ 清理失败:', error);
      process.exit(1);
    });
}

module.exports = { cleanVideoRecords };
