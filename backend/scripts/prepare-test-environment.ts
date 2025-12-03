/**
 * 准备测试环境脚本
 * 
 * 功能：
 * 1. 清空今日打卡记录
 * 2. 重置学习进度的nextReviewAt以模拟待复习单词
 * 3. 清空视频生成任务记录
 * 4. 生成测试用的复习单词（设置不同的复习时间和熟练度）
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function prepareTestEnvironment() {
  const userId = 1;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  console.log('═══════════════════════════════════════════════════════');
  console.log('🧹 准备测试环境');
  console.log('═══════════════════════════════════════════════════════\n');

  try {
    // 1. 清空今日打卡记录
    console.log('1️⃣  清空今日打卡记录...');
    const deleteCheckIn = await prisma.dailyCheckIn.deleteMany({
      where: {
        userId,
        checkInDate: today,
      },
    });
    console.log(`   ✅ 已删除 ${deleteCheckIn.count} 条今日打卡记录\n`);

    // 2. 清空视频生成任务
    console.log('2️⃣  清空视频生成任务...');
    const deleteVideoJobs = await prisma.videoGenerationJob.deleteMany({
      where: {
        userId,
        createdAt: {
          gte: today,
        },
      },
    });
    console.log(`   ✅ 已删除 ${deleteVideoJobs.count} 条视频生成任务\n`);

    // 3. 生成测试用的复习单词
    console.log('3️⃣  生成测试用学习进度...');

    // 获取用户当前的学习进度（已学但未完全掌握的）
    const existingProgress = await prisma.userLearningProgress.findMany({
      where: {
        userId,
        masteryLevel: {
          lt: 5, // 熟练度<5的词义
        },
      },
      include: {
        meaning: {
          include: {
            word: true,
          },
        },
      },
      take: 30,
      orderBy: {
        lastReviewAt: 'asc',
      },
    });

    console.log(`   找到 ${existingProgress.length} 个现有学习进度`);

    // 如果学习进度不足，创建一些基础进度
    if (existingProgress.length < 20) {
      console.log('   ⚠️  学习进度较少，添加一些基础词汇...');

      // 获取基础词汇的词义
      const meanings = await prisma.meaning.findMany({
        where: {
          word: {
            word: {
              in: [
                'abandon', 'ability', 'abstract', 'achieve', 'acquire',
                'culture', 'beautiful', 'important', 'knowledge', 'practice',
                'experiment', 'discover', 'adventure', 'purpose', 'success',
              ],
            },
          },
        },
        include: {
          word: true,
        },
        take: 20,
      });

      console.log(`   找到 ${meanings.length} 个基础词义`);

      // 为每个词义创建学习进度
      for (const meaning of meanings) {
        const randomDaysAgo = Math.floor(Math.random() * 7); // 0-7天前
        const lastReview = new Date(Date.now() - randomDaysAgo * 24 * 60 * 60 * 1000);
        
        await prisma.userLearningProgress.upsert({
          where: {
            userId_meaningId: {
              userId,
              meaningId: meaning.id,
            },
          },
          create: {
            userId,
            meaningId: meaning.id,
            masteryLevel: Math.floor(Math.random() * 3) + 1, // 1-3级
            easinessFactor: 2.5,
            interval: randomDaysAgo || 1,
            repetitions: Math.floor(Math.random() * 5),
            lastReviewAt: lastReview,
            nextReviewAt: lastReview, // 先设为过去时间，待后续调整
            reviewCount: Math.floor(Math.random() * 5),
          },
          update: {
            masteryLevel: Math.floor(Math.random() * 3) + 1,
          },
        });
      }

      console.log(`   ✅ 已添加/更新 ${meanings.length} 个学习进度\n`);
    }

    // 重新获取所有进度用于设置测试场景
    const allProgress = await prisma.userLearningProgress.findMany({
      where: {
        userId,
        masteryLevel: {
          lt: 5,
        },
      },
      include: {
        meaning: {
          include: {
            word: true,
          },
        },
      },
      take: 30,
      orderBy: {
        lastReviewAt: 'asc',
      },
    });

    // 设置不同的复习场景
    const reviewScenarios = [
      {
        name: '今日到期（需立即复习）',
        count: 8,
        nextReviewDate: new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000), // 昨天到期
        masteryLevel: 2,
      },
      {
        name: '即将到期（1-2天内）',
        count: 5,
        nextReviewDate: new Date(today.getTime() + 1 * 24 * 60 * 60 * 1000),
        masteryLevel: 3,
      },
      {
        name: '熟悉但需巩固',
        count: 7,
        nextReviewDate: new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000),
        masteryLevel: 4,
      },
    ];

    let totalUpdated = 0;
    for (const scenario of reviewScenarios) {
      const progressToUpdate = allProgress.slice(totalUpdated, totalUpdated + scenario.count);

      for (const progress of progressToUpdate) {
        await prisma.userLearningProgress.update({
          where: { id: progress.id },
          data: {
            nextReviewAt: scenario.nextReviewDate,
            masteryLevel: scenario.masteryLevel,
            lastReviewAt: new Date(Date.now() - Math.random() * 5 * 24 * 60 * 60 * 1000),
          },
        });
      }

      console.log(`   📌 ${scenario.name}: ${progressToUpdate.length} 个词义`);
      totalUpdated += scenario.count;
    }

    console.log(`\n   ✅ 已设置 ${totalUpdated} 个测试复习单词\n`);

    // 4. 显示当前状态
    console.log('═══════════════════════════════════════════════════════');
    console.log('📊 当前测试环境状态');
    console.log('═══════════════════════════════════════════════════════\n');

    const stats = await prisma.userLearningProgress.groupBy({
      by: ['masteryLevel'],
      where: { userId },
      _count: true,
    });

    console.log('按熟练度分布：');
    stats.forEach((stat) => {
      const stars = '⭐'.repeat(stat.masteryLevel);
      console.log(`   ${stars} (${stat.masteryLevel}): ${stat._count} 个词义`);
    });

    const todayReviewCount = await prisma.userLearningProgress.count({
      where: {
        userId,
        nextReviewAt: {
          lte: today,
        },
      },
    });

    console.log(`\n今日待复习: ${todayReviewCount} 个词义`);

    const totalProgress = await prisma.userLearningProgress.count({
      where: { userId },
    });

    console.log(`总学习进度: ${totalProgress} 个词义\n`);

    // 5. 获取并显示具体的待复习单词（去重显示单词级别）
    const reviewProgress = await prisma.userLearningProgress.findMany({
      where: {
        userId,
        nextReviewAt: {
          lte: today,
        },
      },
      include: {
        meaning: {
          include: {
            word: true,
          },
        },
      },
      orderBy: {
        nextReviewAt: 'asc',
      },
      take: 10,
    });

    if (reviewProgress.length > 0) {
      console.log('今日待复习单词示例（前10个词义）：');
      console.log('─────────────────────────────────────────────────────');
      reviewProgress.forEach((progress, index) => {
        const stars = '⭐'.repeat(progress.masteryLevel);
        const word = progress.meaning.word.word;
        const pos = progress.meaning.partOfSpeech;
        const definition = progress.meaning.definition;
        
        console.log(`${index + 1}. ${word} [${pos}] ${stars}`);
        console.log(`   ${definition}`);
        console.log(`   复习次数: ${progress.reviewCount} | 上次复习: ${progress.lastReviewAt?.toLocaleDateString() || '从未'}`);
      });
      console.log('');
    }

    console.log('═══════════════════════════════════════════════════════');
    console.log('✅ 测试环境准备完成！');
    console.log('═══════════════════════════════════════════════════════\n');

    console.log('现在你可以测试以下功能：');
    console.log('1. 📚 学习功能 - 学习新单词');
    console.log('2. 🔄 复习功能 - 复习今日到期的单词');
    console.log('3. 📊 统计功能 - 查看学习统计');
    console.log('4. 🎬 视频生成 - 生成今日学习视频');
    console.log('5. 🔀 乱序功能 - 打乱单词顺序学习');
    console.log('6. 🎯 更换目标 - 切换学习目标（CET4/CET6/考研等）\n');
  } catch (error) {
    console.error('❌ 准备测试环境失败:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

prepareTestEnvironment();
