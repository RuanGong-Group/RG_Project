/**
 * 通用控制器 - 供 V2 和 V3 共用的端点
 * 包含今日计划等通用功能
 */

import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import prisma from '../utils/prisma';
import { getBeijingTime, getBeijingToday } from '../utils/datetime';
import { getTodayLearnedNewWords as getTodayLearnedNewWordsService } from '../services/learning.service';
import { getOrCreateSalt, applyStableShuffle } from '../utils/shuffle';

/**
 * 获取今日已学习的新单词
 * GET /api/learning/today-new-words
 */
export const getTodayLearnedNewWords = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: '用户未认证' });
      return;
    }

    const words = await getTodayLearnedNewWordsService(userId);

    res.json({
      success: true,
      data: {
        words
      }
    });
  } catch (error) {
    console.error('获取今日新词错误:', error);
    res.status(500).json({ success: false, message: '服务器错误', error: error instanceof Error ? error.message : '未知错误' });
  }
};

/**
 * 获取今日学习计划
 * GET /api/learning/today-plan
 * 
 * 功能：统计今日进度、待复习内容、新学习配额
 * 适用于：V2 和 V3 学习流程
 */
export const getTodayPlan = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: '用户未认证' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { dailyLearningGoal: true, currentBookTagId: true }
    });

    if (!user || !user.currentBookTagId) {
      res.status(400).json({ success: false, message: '请先选择一个词书' });
      return;
    }

    const now = getBeijingTime();
    const todayStart = new Date(now);
    todayStart.setUTCHours(0, 0, 0, 0);

    // 1. 从 dailyCheckIn 表获取今日统计（更准确，与其他页面一致）
    const today = getBeijingToday(); // 使用 Date 对象，不是字符串

    const todayCheckIn = await prisma.dailyCheckIn.findUnique({
      where: {
        userId_checkInDate: {
          userId: userId,
          checkInDate: today
        }
      }
    });

    const learnedWordsToday = todayCheckIn?.wordsLearned || 0;
    const reviewedWordsToday = todayCheckIn?.wordsReviewed || 0;

    // 🔍 调试日志：检查统计数据来源
    console.log('📊 [getTodayPlan] 统计数据:', {
      userId,
      today,
      fromDB: {
        wordsLearned: todayCheckIn?.wordsLearned,
        wordsReviewed: todayCheckIn?.wordsReviewed,
        meaningsLearned: todayCheckIn?.meaningsLearned,
        meaningsReviewed: todayCheckIn?.meaningsReviewed
      },
      willReturn: {
        learned: learnedWordsToday,
        reviewed: reviewedWordsToday
      }
    });

    // 2. 统计待复习内容
    const dueReviews = await prisma.userLearningProgress.findMany({
      where: {
        userId,
        nextReviewAt: { lte: now },
        masteryLevel: { lt: 6 },
        meaning: { word: { bookTags: { some: { bookTagId: user.currentBookTagId } } } }
      },
      select: { meaning: { select: { wordId: true, word: { select: { word: true } }, id: true } } },
      distinct: ['meaningId'],
      orderBy: { nextReviewAt: 'asc' }
    });

    const dueReviewWordsMap = new Map<number, { word: string; dueMeanings: number; totalMeanings: number }>();
    for (const review of dueReviews) {
      const wordId = review.meaning.wordId;
      if (!dueReviewWordsMap.has(wordId)) {
        const totalMeanings = await prisma.meaning.count({ where: { wordId } });
        dueReviewWordsMap.set(wordId, {
          word: review.meaning.word.word,
          dueMeanings: 0,
          totalMeanings: totalMeanings
        });
      }
      dueReviewWordsMap.get(wordId)!.dueMeanings += 1;
    }
    const reviewWords = Array.from(dueReviewWordsMap.entries()).map(([wordId, data]) => ({ wordId, ...data }));
    
    // Calculate total due meanings (not unique words)
    const totalDueMeanings = dueReviews.length;

    // 3. 统计待学新词
    const allWordIdsInBook = (await prisma.wordTagRelation.findMany({
      where: { bookTagId: user.currentBookTagId },
      select: { wordId: true },
      orderBy: { word: { id: 'asc' } }
    })).map(r => r.wordId);

    const learnedWordIds = new Set((await prisma.userLearningProgress.findMany({
      where: { userId, meaning: { wordId: { in: allWordIdsInBook } } },
      select: { meaning: { select: { wordId: true } } },
      distinct: ['meaningId']
    })).map(p => p.meaning.wordId));

    let newWordsAvailable = allWordIdsInBook.filter(id => !learnedWordIds.has(id));

    // 应用稳定乱序 (Stable Shuffle)
    // 确保用户看到的单词顺序是固定的，但又是随机的
    const salt = await getOrCreateSalt(userId, user.currentBookTagId);
    newWordsAvailable = applyStableShuffle(newWordsAvailable, userId, salt);

    // 取前10个
    const targetIds = newWordsAvailable.slice(0, 10);

    const newWordsData = await prisma.word.findMany({
      where: { id: { in: targetIds } },
      select: { id: true, word: true, _count: { select: { meanings: true } } }
    });

    // 重新排序以匹配 targetIds 的顺序 (因为 findMany 不保证顺序)
    const newWordsToShow = targetIds
      .map(id => newWordsData.find(w => w.id === id))
      .filter((w): w is NonNullable<typeof w> => !!w);

    const dailyGoal = user.dailyLearningGoal || 20;
    // 新学配额 = 目标 - 今日总完成量（新学+复习）
    const totalCompleted = learnedWordsToday + reviewedWordsToday;
    const newLearningQuota = Math.max(0, dailyGoal - totalCompleted);

    res.json({
      success: true,
      message: '获取今日计划成功',
      data: {
        dailyGoal,
        progress: {
          learned: learnedWordsToday,
          reviewed: reviewedWordsToday,
          total: learnedWordsToday + reviewedWordsToday
        },
        review: {
          dueCount: totalDueMeanings,
          dueWordCount: reviewWords.length,
          words: reviewWords
        },
        newLearning: {
          quota: newLearningQuota,
          available: newWordsAvailable.length,
          words: newWordsToShow.map(w => ({
            wordId: w.id,
            word: w.word,
            totalMeanings: w._count.meanings
          }))
        }
      }
    });

  } catch (error) {
    console.error('获取今日计划错误:', error);
    res.status(500).json({ success: false, message: '服务器错误', error: error instanceof Error ? error.message : '未知错误' });
  }
};
