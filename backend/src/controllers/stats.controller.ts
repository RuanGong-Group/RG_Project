/**
 * 学习统计控制器
 * 处理用户学习数据统计和分析
 */

import { Response } from 'express';
import prisma from '../utils/prisma';
import { AuthRequest } from '../middleware/auth.middleware';
import { getBeijingToday, getBeijingDaysAgo } from '../utils/datetime';

/**
 * 获取学习概览
 * GET /api/stats/overview
 * 
 * 返回数据：
 * - 今日学习单词数
 * - 今日复习单词数
 * - 总掌握单词数（mastery_level >= 3）
 * - 当前词书总单词数
 * - 学习进度百分比
 */
export const getOverview = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: '用户未认证'
      });
      return;
    }

    // 1. 获取用户当前词书
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { currentBookTagId: true }
    });

    if (!user || !user.currentBookTagId) {
      res.status(400).json({
        success: false,
        message: '请先选择一个词书'
      });
      return;
    }

    // 2. 获取今日打卡数据（北京时间）
    const today = getBeijingToday();

    const todayCheckIn = await prisma.dailyCheckIn.findUnique({
      where: {
        userId_checkInDate: {
          userId: userId,
          checkInDate: today
        }
      }
    });

    const todayLearned = todayCheckIn?.wordsLearned || 0;
    const todayReviewed = todayCheckIn?.wordsReviewed || 0;

    // 3. 获取当前词书的所有单词ID
    const wordsInBook = await prisma.wordTagRelation.findMany({
      where: {
        bookTagId: user.currentBookTagId
      },
      select: {
        wordId: true
      }
    });

    const wordIds = wordsInBook.map(w => w.wordId);
    const totalWordsInBook = wordIds.length;

    // 4. 获取这些单词的所有词义ID
    const meaningsInBook = await prisma.meaning.findMany({
      where: {
        wordId: {
          in: wordIds
        }
      },
      select: {
        id: true,
        wordId: true
      }
    });

    const meaningIds = meaningsInBook.map(m => m.id);

    // 5. 统计用户对这些词义的掌握情况
    // 掌握标准：mastery_level >= 3
    const masteredMeanings = await prisma.userLearningProgress.count({
      where: {
        userId: userId,
        meaningId: {
          in: meaningIds
        },
        masteryLevel: {
          gte: 3
        }
      }
    });

    // 6. 计算已学习的单词数（至少学习过一个词义的单词）
    const learnedProgress = await prisma.userLearningProgress.findMany({
      where: {
        userId: userId,
        meaningId: {
          in: meaningIds
        }
      },
      select: {
        masteryLevel: true,
        meaningId: true
      }
    });

    // 创建 meaningId 到 wordId 的映射
    const meaningToWordMap = new Map(
      meaningsInBook.map(m => [m.id, m.wordId])
    );

    // 统计唯一的单词ID
    const learnedWordIds = new Set(
      learnedProgress.map(p => meaningToWordMap.get(p.meaningId)).filter(Boolean)
    );
    const totalLearnedWords = learnedWordIds.size;

    // 7. 统计掌握度分布（按mastery_level分组）
    const masteryDistribution = {
      level0: 0,
      level1: 0,
      level2: 0,
      level3: 0,
      level4: 0,
      level5: 0
    };

    // 遍历所有学习进度，统计每个单词的最高掌握度
    const wordMasteryMap = new Map<number, number>();
    for (const progress of learnedProgress) {
      const wordId = meaningToWordMap.get(progress.meaningId);
      if (!wordId) continue;
      const currentMastery = wordMasteryMap.get(wordId) || 0;
      wordMasteryMap.set(wordId, Math.max(currentMastery, progress.masteryLevel));
    }

    // 统计各级别的单词数量
    for (const mastery of wordMasteryMap.values()) {
      const level = Math.min(Math.max(mastery, 0), 5); // 确保在0-5范围内
      const key = `level${level}` as keyof typeof masteryDistribution;
      masteryDistribution[key]++;
    }

    // 8. 计算学习进度百分比
    const progressPercentage = totalWordsInBook > 0 
      ? Math.round((totalLearnedWords / totalWordsInBook) * 100) 
      : 0;

    // 9. 返回统计数据（兼容前端期望的格式）
    res.json({
      success: true,
      message: '获取学习概览成功',
      data: {
        totalWords: totalWordsInBook,
        learnedWords: totalLearnedWords,
        masteryDistribution: masteryDistribution,
        progressPercentage: progressPercentage,
        masteredMeanings: masteredMeanings,
        today: {
          learned: todayLearned,
          reviewed: todayReviewed,
          total: todayLearned + todayReviewed
        }
      }
    });

  } catch (error) {
    console.error('获取学习概览错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
};

/**
 * 获取学习进度曲线
 * GET /api/stats/progress
 * 
 * 返回最近30天的学习和复习数据
 * 用于绘制学习曲线图
 */
export const getProgressCurve = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: '用户未认证'
      });
      return;
    }

    // 1. 计算30天前的日期（北京时间）
    const today = getBeijingToday();
    const thirtyDaysAgo = getBeijingDaysAgo(29); // 包括今天共30天

    // 2. 查询最近30天的打卡记录
    const checkIns = await prisma.dailyCheckIn.findMany({
      where: {
        userId: userId,
        checkInDate: {
          gte: thirtyDaysAgo,
          lte: today
        }
      },
      orderBy: {
        checkInDate: 'asc'
      }
    });

    // 3. 生成完整的30天数据（包括未打卡的日期，填充为0）
    const progressData = [];
    const checkInMap = new Map(
      checkIns.map(c => [c.checkInDate.toISOString().split('T')[0], c])
    );

    for (let i = 0; i < 30; i++) {
      const date = new Date(thirtyDaysAgo);
      date.setDate(date.getDate() + i);
      const dateKey = date.toISOString().split('T')[0];

      const checkIn = checkInMap.get(dateKey);

      progressData.push({
        date: dateKey,
        learned: checkIn?.wordsLearned || 0,
        reviewed: checkIn?.wordsReviewed || 0,
        total: (checkIn?.wordsLearned || 0) + (checkIn?.wordsReviewed || 0)
      });
    }

    // 4. 计算统计摘要
    const totalLearned = progressData.reduce((sum, d) => sum + d.learned, 0);
    const totalReviewed = progressData.reduce((sum, d) => sum + d.reviewed, 0);
    const activeDays = progressData.filter(d => d.total > 0).length;

    res.json({
      success: true,
      message: '获取学习进度曲线成功',
      data: {
        progressData: progressData, // 直接返回数组，符合前端期望
        period: {
          startDate: thirtyDaysAgo.toISOString().split('T')[0],
          endDate: today.toISOString().split('T')[0],
          days: 30
        },
        summary: {
          totalLearned: totalLearned,
          totalReviewed: totalReviewed,
          totalWords: totalLearned + totalReviewed,
          activeDays: activeDays
        }
      }
    });

  } catch (error) {
    console.error('获取学习进度曲线错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
};
