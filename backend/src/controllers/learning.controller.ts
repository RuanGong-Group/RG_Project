import { Response } from 'express';
import prisma from '../utils/prisma';
import { AuthRequest } from '../middleware/auth.middleware';
import { updateTodayCheckIn } from './checkin.controller';
import { getBeijingTime, safeJsonParse } from '../utils/datetime';
import { Prisma, Word, Meaning, ExamplePool, WordTagRelation, UserLearningProgress, MeaningExampleRelation } from '@prisma/client';

// 为 Prisma 查询结果定义更精确的类型
type MeaningWithExamples = Meaning & {
  examples: (MeaningExampleRelation & {
    example: ExamplePool;
  })[];
};

type WordWithMeanings = Word & {
  meanings: MeaningWithExamples[];
};

type ReviewProgressWithDetails = UserLearningProgress & {
  meaning: Meaning & {
    word: Word;
    examples: (MeaningExampleRelation & {
      example: ExamplePool;
    })[];
  };
};


/**
 * 获取下一个待学单词（V2 学习流程）
 * 规则:
 * 1. 优先复习：检查是否有到期的复习单词，如果有，提示先复习。
 * 2. 检查目标：检查今日新学单词数是否已达每日目标，如果达到，提示目标完成。
 * 3. 获取新词：如果以上都不是，则按顺序从词书中获取第一个用户从未学过的单词。
 * GET /api/learning/word/next
 */
export const getNextWordToLearn = async (
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
      select: { currentBookTagId: true, dailyLearningGoal: true, currentBookTag: { select: { tagName: true } } }
    });

    if (!user || !user.currentBookTagId) {
      res.status(400).json({ success: false, message: '请先选择一个词书开始学习' });
      return;
    }

    const now = getBeijingTime();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    // 1. 检查是否有到期复习
    const dueReviewCount = await prisma.userLearningProgress.count({
      where: {
        userId,
        nextReviewAt: { lte: now },
        masteryLevel: { lt: 6 },
        meaning: { word: { bookTags: { some: { bookTagId: user.currentBookTagId } } } }
      }
    });

    if (dueReviewCount > 0) {
      res.json({
        success: true,
        message: `📚 请先完成复习任务！还有 ${dueReviewCount} 个词义需要复习。`,
        data: null,
        code: 'REVIEW_FIRST'
      });
      return;
    }

    // 2. 检查今日新学单词数是否已达目标
    const dailyGoal = user.dailyLearningGoal || 20;
    const learnedTodayResult = await prisma.userLearningProgress.groupBy({
      by: ['meaningId'],
      where: {
        userId,
        createdAt: { gte: todayStart },
        meaning: { word: { bookTags: { some: { bookTagId: user.currentBookTagId } } } }
      },
    });
    
    const learnedMeaningIdsToday = learnedTodayResult.map(item => item.meaningId);
    const learnedWordsToday = await prisma.meaning.findMany({
        where: { id: { in: learnedMeaningIdsToday } },
        select: { wordId: true },
        distinct: ['wordId']
    });
    const learnedCount = learnedWordsToday.length;

    if (learnedCount >= dailyGoal) {
      res.json({
        success: true,
        message: `✅ 今日学习目标已完成！已学习 ${learnedCount} 个新单词。`,
        data: null,
        code: 'GOAL_MET'
      });
      return;
    }

    // 3. 获取该词书下的所有单词ID
    const wordRelationsInBook = await prisma.wordTagRelation.findMany({
      where: { bookTagId: user.currentBookTagId },
      select: { wordId: true, masteryFocus: true },
      orderBy: { word: { id: 'asc' } } // 保证单词顺序
    });

    if (wordRelationsInBook.length === 0) {
      res.status(404).json({ success: false, message: '该词书中没有单词' });
      return;
    }
    
    const wordIdsInBook = wordRelationsInBook.map(r => r.wordId);
    const masteryFocusMap = new Map(wordRelationsInBook.map(r => [r.wordId, r.masteryFocus]));

    // 4. 找到第一个用户从未学习过的单词
    const learnedProgress = await prisma.userLearningProgress.findMany({
      where: { userId, meaning: { wordId: { in: wordIdsInBook } } },
      select: { meaning: { select: { wordId: true } } },
      distinct: ['meaningId']
    });
    const learnedWordIds = new Set(learnedProgress.map(p => p.meaning.wordId));

    let targetWordId: number | null = null;
    for (const wordId of wordIdsInBook) {
      if (!learnedWordIds.has(wordId)) {
        targetWordId = wordId;
        break;
      }
    }

    if (targetWordId === null) {
      res.json({
        success: true,
        message: '恭喜！您已经学习完该词书的所有单词',
        data: null,
        code: 'BOOK_COMPLETED'
      });
      return;
    }

    // 5. 获取目标单词的完整信息
    const targetWord = await prisma.word.findUnique({
      where: { id: targetWordId },
      include: {
        meanings: {
          include: {
            examples: {
              include: { example: true },
              orderBy: { isPrimary: 'desc' }
            }
          },
          orderBy: { id: 'asc' }
        }
      }
    }) as WordWithMeanings | null;

    if (!targetWord) throw new Error(`Word with id ${targetWordId} not found.`);

    const meanings = targetWord.meanings.map(meaning => ({
      meaningId: meaning.id,
      partOfSpeech: meaning.partOfSpeech,
      definition: meaning.definition,
      extra: safeJsonParse(meaning.extra as string, null),
      examples: meaning.examples.map(rel => ({
        id: rel.example.id,
        sentence: rel.example.sentence,
        sourceType: rel.example.sourceType,
        sourceDetail: rel.example.sourceDetail,
      }))
    }));

    res.json({
      success: true,
      message: '获取待学单词成功',
      data: {
        wordId: targetWord.id,
        word: targetWord.word,
        pronunciation: safeJsonParse(targetWord.pronunciation as string, { uk: '', us: '' }),
        lemma: targetWord.lemma,
        meanings: meanings,
        masteryFocus: masteryFocusMap.get(targetWord.id) || 'recognition',
        bookTag: user.currentBookTag?.tagName
      }
    });

  } catch (error) {
    console.error('获取待学单词错误:', error);
    res.status(500).json({ success: false, message: '服务器错误', error: error instanceof Error ? error.message : '未知错误' });
  }
};

/**
 * 提交单个或多个词义的学习结果 (V2)
 * POST /api/learning/progress
 */
export const updateLearningProgress = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    // results: [{ meaningId: number, isCorrect: boolean }]
    const { results } = req.body;

    if (!userId) {
      res.status(401).json({ success: false, message: '用户未认证' });
      return;
    }
    if (!Array.isArray(results) || results.length === 0) {
      res.status(400).json({ success: false, message: '提交的结果格式不正确' });
      return;
    }

    const now = getBeijingTime();
    const responseData = [];

    for (const result of results) {
      const { meaningId, isCorrect } = result;
      if (!meaningId || typeof isCorrect !== 'boolean') continue;

      const progress = await prisma.userLearningProgress.findUnique({
        where: { userId_meaningId: { userId, meaningId } }
      });

      let newMasteryLevel = 0;
      let reviewCount = 0;

      if (progress) { // 复习
        reviewCount = progress.reviewCount + 1;
        newMasteryLevel = isCorrect
          ? Math.min(progress.masteryLevel + 1, 6)
          : Math.max(progress.masteryLevel - 1, 0);
      } else { // 新学
        reviewCount = 1;
        newMasteryLevel = isCorrect ? 1 : 0;
      }

      const nextReviewAt = calculateNextReviewTime(now, newMasteryLevel);

      const updatedProgress = await prisma.userLearningProgress.upsert({
        where: { userId_meaningId: { userId, meaningId } },
        update: {
          masteryLevel: newMasteryLevel,
          lastReviewAt: now,
          nextReviewAt: nextReviewAt,
          reviewCount: reviewCount,
        },
        create: {
          userId,
          meaningId,
          masteryLevel: newMasteryLevel,
          lastReviewAt: now,
          nextReviewAt: nextReviewAt,
          reviewCount: reviewCount,
        }
      });
      
      // 首次学习时更新打卡信息
      if (reviewCount === 1) {
        await updateTodayCheckIn(userId, 'learn-meaning', { meaningId });
      }

      responseData.push({
        meaningId: updatedProgress.meaningId,
        masteryLevel: updatedProgress.masteryLevel,
        nextReviewAt: updatedProgress.nextReviewAt,
      });
    }

    res.json({ success: true, message: '学习进度更新成功', data: responseData });

  } catch (error) {
    console.error('更新学习进度错误:', error);
    res.status(500).json({ success: false, message: '服务器错误', error: error instanceof Error ? error.message : '未知错误' });
  }
};

/**
 * 获取今日待复习内容 (V2)
 * GET /api/learning/review/today
 */
export const getTodayReviewContent = async (
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
      select: { currentBookTagId: true, currentBookTag: { select: { tagName: true } } }
    });

    if (!user || !user.currentBookTagId) {
      res.status(400).json({ success: false, message: '请先选择一个词书开始学习' });
      return;
    }

    const now = getBeijingTime();
    const reviewProgressList = await prisma.userLearningProgress.findMany({
      where: {
        userId,
        nextReviewAt: { lte: now },
        masteryLevel: { lt: 6 },
        meaning: { word: { bookTags: { some: { bookTagId: user.currentBookTagId } } } }
      },
      include: {
        meaning: {
          include: {
            word: true,
            examples: {
              include: { example: true },
              orderBy: { isPrimary: 'desc' }
            }
          }
        }
      },
      orderBy: { nextReviewAt: 'asc' }
    }) as ReviewProgressWithDetails[];

    if (reviewProgressList.length === 0) {
      res.json({ success: true, message: '今日暂无需要复习的内容', data: { totalReviews: 0, reviews: [] } });
      return;
    }

    const wordIds = reviewProgressList.map(p => p.meaning.word.id);
    const wordTagRelations = await prisma.wordTagRelation.findMany({
      where: { wordId: { in: wordIds }, bookTagId: user.currentBookTagId },
      select: { wordId: true, masteryFocus: true }
    });
    const wordTagMap = new Map(wordTagRelations.map(r => [r.wordId, r.masteryFocus]));

    const reviews = reviewProgressList.map(progress => {
      const { meaning } = progress;
      const { word } = meaning;
      const masteryFocus = wordTagMap.get(word.id) || 'recognition';

      return {
        progressId: progress.id,
        meaningId: meaning.id,
        word: word.word,
        wordId: word.id,
        pronunciation: safeJsonParse(word.pronunciation as string, { uk: '', us: '' }),
        partOfSpeech: meaning.partOfSpeech,
        definition: meaning.definition,
        extra: safeJsonParse(meaning.extra as string, null),
        examples: meaning.examples.map(rel => ({
          id: rel.example.id,
          sentence: rel.example.sentence,
          sourceType: rel.example.sourceType,
          sourceDetail: rel.example.sourceDetail,
        })),
        reviewMode: masteryFocus,
        masteryLevel: progress.masteryLevel,
      };
    });

    const shuffledReviews = shuffleReviewsByWord(reviews);

    res.json({
      success: true,
      message: '获取今日复习内容成功',
      data: {
        totalReviews: shuffledReviews.length,
        bookTag: user.currentBookTag?.tagName,
        reviews: shuffledReviews
      }
    });

  } catch (error) {
    console.error('获取复习内容错误:', error);
    res.status(500).json({ success: false, message: '服务器错误', error: error instanceof Error ? error.message : '未知错误' });
  }
};

/**
 * 提交复习结果 (V2)
 * POST /api/learning/review/submit
 */
export const submitReviewResult = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const { meaningId, isCorrect } = req.body;

    if (!userId) {
      res.status(401).json({ success: false, message: '用户未认证' });
      return;
    }
    if (!meaningId || typeof isCorrect !== 'boolean') {
      res.status(400).json({ success: false, message: '请求参数不合法' });
      return;
    }

    const progress = await prisma.userLearningProgress.findUnique({
      where: { userId_meaningId: { userId, meaningId } }
    });

    if (!progress) {
      res.status(404).json({ success: false, message: '未找到该词义的学习进度' });
      return;
    }

    const now = getBeijingTime();
    const newMasteryLevel = isCorrect
      ? Math.min(progress.masteryLevel + 1, 6)
      : Math.max(progress.masteryLevel - 1, 0);

    const nextReviewAt = calculateNextReviewTime(now, newMasteryLevel);

    const updatedProgress = await prisma.userLearningProgress.update({
      where: { userId_meaningId: { userId, meaningId } },
      data: {
        masteryLevel: newMasteryLevel,
        lastReviewAt: now,
        nextReviewAt: nextReviewAt,
        reviewCount: progress.reviewCount + 1,
      }
    });

    await updateTodayCheckIn(userId, 'review-meaning', { meaningId });

    res.json({
      success: true,
      message: '复习结果提交成功',
      data: {
        meaningId: meaningId,
        masteryLevel: updatedProgress.masteryLevel,
        nextReviewAt: updatedProgress.nextReviewAt,
      }
    });

  } catch (error) {
    console.error('提交复习结果错误:', error);
    res.status(500).json({ success: false, message: '服务器错误', error: error instanceof Error ? error.message : '未知错误' });
  }
};

/**
 * 获取今日学习计划 (V2)
 * GET /api/learning/today-plan
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
    todayStart.setHours(0, 0, 0, 0);

    // 1. 统计今日进度
    const learnedProgressToday = await prisma.userLearningProgress.findMany({
      where: {
        userId,
        createdAt: { gte: todayStart },
        meaning: { word: { bookTags: { some: { bookTagId: user.currentBookTagId } } } }
      },
      select: { meaning: { select: { wordId: true } } },
      distinct: ['meaningId']
    });
    const learnedWordsToday = new Set(learnedProgressToday.map(p => p.meaning.wordId));

    const reviewedProgressToday = await prisma.userLearningProgress.findMany({
      where: {
        userId,
        lastReviewAt: { gte: todayStart },
        reviewCount: { gt: 1 }, // reviewCount > 1 表示是复习
        meaning: { word: { bookTags: { some: { bookTagId: user.currentBookTagId } } } }
      },
      select: { meaning: { select: { wordId: true } } },
      distinct: ['meaningId']
    });
    const reviewedWordsToday = new Set(reviewedProgressToday.map(p => p.meaning.wordId));

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

    const newWordsAvailable = allWordIdsInBook.filter(id => !learnedWordIds.has(id));
    const newWordsToShow = await prisma.word.findMany({
      where: { id: { in: newWordsAvailable.slice(0, 10) } },
      select: { id: true, word: true, _count: { select: { meanings: true } } }
    });

    const dailyGoal = user.dailyLearningGoal || 20;
    const newLearningQuota = Math.max(0, dailyGoal - learnedWordsToday.size);

    res.json({
      success: true,
      message: '获取今日计划成功',
      data: {
        dailyGoal,
        progress: {
          learned: learnedWordsToday.size,
          reviewed: reviewedWordsToday.size,
          total: learnedWordsToday.size + reviewedWordsToday.size
        },
        review: {
          dueCount: dueReviews.length,
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

function shuffleReviewsByWord(reviews: any[]): any[] {
  if (reviews.length <= 1) return reviews;

  const groupByWord = new Map<number, any[]>();
  for (const review of reviews) {
    if (!groupByWord.has(review.wordId)) {
      groupByWord.set(review.wordId, []);
    }
    groupByWord.get(review.wordId)!.push(review);
  }

  if (groupByWord.size === 1) return reviews;

  const wordGroups = Array.from(groupByWord.values());
  const result: any[] = [];
  let maxIterations = reviews.length;

  while (result.length < reviews.length && maxIterations > 0) {
    for (const group of wordGroups) {
      if (group.length > 0) {
        result.push(group.shift()!);
      }
    }
    maxIterations--;
  }

  return result.map(({ wordId, ...rest }) => rest);
}

function calculateNextReviewTime(now: Date, masteryLevel: number): Date {
  const intervals = [
    5 * 60 * 1000,        // 0: 5分钟
    30 * 60 * 1000,       // 1: 30分钟
    12 * 60 * 60 * 1000,  // 2: 12小时
    24 * 60 * 60 * 1000,  // 3: 1天
    2 * 24 * 60 * 60 * 1000,   // 4: 2天
    7 * 24 * 60 * 60 * 1000,   // 5: 7天
    30 * 24 * 60 * 60 * 1000   // 6: 30天 (已掌握)
  ];
  const level = Math.max(0, Math.min(masteryLevel, intervals.length - 1));
  return new Date(now.getTime() + intervals[level]);
}