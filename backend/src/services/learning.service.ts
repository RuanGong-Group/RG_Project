import prisma from '../utils/prisma';
import { getOrCreateSalt, applyStableShuffle } from '../utils/shuffle';
import { getBeijingToday, calculateNextReviewTime } from '../utils/datetime';
import { updateTodayCheckIn } from '../controllers/checkin.controller';

/**
 * SM-2 算法实现
 * 基于 SuperMemo-2 算法计算复习间隔
 * 
 * @param quality - 回答质量 (0-5)，5=完美，4=犹豫后正确，3=困难，2-0=错误
 * @param easinessFactor - 当前难度因子 (最小 1.3)
 * @param interval - 当前间隔天数
 * @param repetitions - 连续正确次数
 * @returns 更新后的 { easinessFactor, interval, repetitions }
 */
function calculateSM2(
  quality: number,
  easinessFactor: number,
  interval: number,
  repetitions: number
): { easinessFactor: number; interval: number; repetitions: number } {
  // 更新 easinessFactor
  let newEF = easinessFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  if (newEF < 1.3) newEF = 1.3;

  let newInterval: number;
  let newReps: number;

  if (quality < 3) {
    // 回答错误，重置
    newReps = 0;
    newInterval = 1;
  } else {
    // 回答正确
    newReps = repetitions + 1;
    if (newReps === 1) {
      newInterval = 1;
    } else if (newReps === 2) {
      newInterval = 6;
    } else {
      newInterval = Math.round(interval * newEF);
    }
  }

  return {
    easinessFactor: newEF,
    interval: newInterval,
    repetitions: newReps
  };
}

/**
 * 记录学习结果并更新进度
 * 
 * @param userId - 用户 ID
 * @param meaningId - 词义 ID
 * @param isCorrect - 是否回答正确
 * @param responseQuality - 回答质量 (0-5)，如果未提供则根据 isCorrect 推断
 */
export async function recordLearningResult(
  userId: number,
  meaningId: number,
  isCorrect: boolean,
  responseQuality?: number
) {
  // 如果未提供 quality，则根据 isCorrect 推断
  const quality = responseQuality !== undefined 
    ? responseQuality 
    : isCorrect ? 4 : 0;

  // 查找现有进度
  let progress = await prisma.userLearningProgress.findUnique({
    where: {
      userId_meaningId: { userId, meaningId }
    }
  });

  if (!progress) {
    // 首次学习，创建新记录
    const nextReview = calculateNextReviewTime(1); // 首次默认 1 天后早上8点复习

    progress = await prisma.userLearningProgress.create({
      data: {
        userId,
        meaningId,
        masteryLevel: isCorrect ? 1 : 0,
        easinessFactor: 2.5,
        interval: 1,
        repetitions: isCorrect ? 1 : 0,
        lastReviewAt: new Date(),
        nextReviewAt: nextReview,
        reviewCount: 1,
        consecutiveCorrect: isCorrect ? 1 : 0
      }
    });

    // 更新每日打卡统计 (新学)
    await updateTodayCheckIn(userId, 'learn-meaning', { meaningId });

  } else {
    // 更新现有进度
    const sm2Result = calculateSM2(
      quality,
      progress.easinessFactor,
      progress.interval,
      progress.repetitions
    );

    const nextReview = calculateNextReviewTime(sm2Result.interval); // 统一到早上8点复习

    // 计算新的 masteryLevel (0-5)
    let newMasteryLevel = progress.masteryLevel;
    if (isCorrect) {
      if (newMasteryLevel < 5) newMasteryLevel += 1;
    } else {
      if (newMasteryLevel > 0) newMasteryLevel -= 1;
    }

    progress = await prisma.userLearningProgress.update({
      where: { id: progress.id },
      data: {
        masteryLevel: newMasteryLevel,
        easinessFactor: sm2Result.easinessFactor,
        interval: sm2Result.interval,
        repetitions: sm2Result.repetitions,
        lastReviewAt: new Date(),
        nextReviewAt: nextReview,
        reviewCount: progress.reviewCount + 1,
        consecutiveCorrect: isCorrect ? progress.consecutiveCorrect + 1 : 0
      }
    });

    // 更新每日打卡统计 (复习)
    await updateTodayCheckIn(userId, 'review-meaning', { meaningId });
  }

  return progress;
}

/**
 * 获取用户待复习的词义列表
 * 
 * @param userId - 用户 ID
 * @param limit - 返回数量限制
 * @returns 待复习的词义 ID 列表
 */
export async function getDueReviews(userId: number, limit = 20): Promise<number[]> {
  const now = new Date();
  const dueProgress = await prisma.userLearningProgress.findMany({
    where: {
      userId,
      nextReviewAt: { lte: now }
    },
    orderBy: { nextReviewAt: 'asc' },
    take: limit,
    select: { meaningId: true }
  });

  return dueProgress.map(p => p.meaningId);
}

/**
 * 获取用户尚未学习的新词义（带稳定乱序）
 * 
 * @param userId - 用户 ID
 * @param bookTagId - 词书标签 ID（可选）
 * @param limit - 返回数量限制
 * @returns 新词义 ID 列表（按稳定乱序排列）
 */
export async function getNewMeanings(
  userId: number,
  bookTagId?: number,
  limit = 20
): Promise<number[]> {
  // 获取用户已学习的所有 meaningId
  const learned = await prisma.userLearningProgress.findMany({
    where: { userId },
    select: { meaningId: true }
  });
  const learnedIds = learned.map(p => p.meaningId);

  // 查询未学习的词义（包含 wordId 用于分组和乱序）
  const whereClause: any = {
    id: { notIn: learnedIds }
  };

  if (bookTagId) {
    whereClause.word = {
      bookTags: {
        some: { bookTagId }
      }
    };
  }

  const newMeanings = await prisma.meaning.findMany({
    where: whereClause,
    select: { 
      id: true,
      wordId: true 
    }
  });

  if (newMeanings.length === 0) {
    return [];
  }

  // 如果没有指定词书，直接返回（不做乱序）
  if (!bookTagId) {
    return newMeanings.slice(0, limit).map(m => m.id);
  }

  // 获取稳定乱序的 salt
  const salt = await getOrCreateSalt(userId, bookTagId);

  // 按单词分组（一个单词可能有多个词义）
  const meaningsByWord = new Map<number, number[]>();
  for (const meaning of newMeanings) {
    if (!meaningsByWord.has(meaning.wordId)) {
      meaningsByWord.set(meaning.wordId, []);
    }
    meaningsByWord.get(meaning.wordId)!.push(meaning.id);
  }

  // 获取所有单词ID并应用稳定乱序
  const wordIds = Array.from(meaningsByWord.keys());
  const shuffledWordIds = applyStableShuffle(wordIds, userId, salt);

  // 按乱序后的单词顺序，收集词义ID
  const result: number[] = [];
  for (const wordId of shuffledWordIds) {
    const meaningIds = meaningsByWord.get(wordId)!;
    result.push(...meaningIds);
    
    if (result.length >= limit) {
      break;
    }
  }

  return result.slice(0, limit);
}

/**
 * 获取用户学习统计
 */
export async function getUserLearningStats(userId: number) {
  const total = await prisma.userLearningProgress.count({
    where: { userId }
  });

  const now = new Date();
  const dueCount = await prisma.userLearningProgress.count({
    where: {
      userId,
      nextReviewAt: { lte: now }
    }
  });

  const masteryLevels = await prisma.userLearningProgress.groupBy({
    by: ['masteryLevel'],
    where: { userId },
    _count: true
  });

  return {
    totalLearned: total,
    dueForReview: dueCount,
    masteryDistribution: masteryLevels.reduce((acc, item) => {
      acc[`level${item.masteryLevel}`] = item._count;
      return acc;
    }, {} as Record<string, number>)
  };
}

/**
 * 获取用于生成每日视频的单词列表
 * 策略：
 * 1. 优先获取今日新学的单词 (Reinforce today's learning)
 * 2. 如果不足，获取待复习的单词 (Review due words)
 * 3. 如果还不足，获取新词 (New words from book)
 * 
 * @param userId - 用户 ID
 * @param limit - 总单词数量 (默认 7 - 黄金记忆容量)
 */
export async function getDailyWordsForVideo(userId: number, limit = 7): Promise<{ word: string; meaning: string; id: number }[]> {
  const today = getBeijingToday();

  // 1. 获取今日活跃的单词 (新学 createdAt >= today OR 复习 lastReviewAt >= today)
  const todayProgress = await prisma.userLearningProgress.findMany({
    where: {
      userId,
      OR: [
        { createdAt: { gte: today } },
        { lastReviewAt: { gte: today } }
      ]
    },
    select: { meaningId: true }
  });
  
  let selectedMeaningIds: number[] = [];

  if (todayProgress.length > 0) {
    // 去重 (因为 OR 可能导致重复? 不, findMany 返回对象列表, 但 meaningId 可能重复吗? userLearningProgress 是 unique(userId, meaningId), 所以不会重复)
    const todayIds = todayProgress.map(p => p.meaningId);
    
    // 如果今日学习的单词超过限制，随机抽取 limit 个
    if (todayIds.length > limit) {
      // Fisher-Yates Shuffle
      for (let i = todayIds.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [todayIds[i], todayIds[j]] = [todayIds[j], todayIds[i]];
      }
      selectedMeaningIds = todayIds.slice(0, limit);
    } else {
      selectedMeaningIds = todayIds;
    }
  }

  // 2. 如果不足 limit，用待复习的单词填充 (排除已选中的)
  if (selectedMeaningIds.length < limit) {
    const remaining = limit - selectedMeaningIds.length;
    
    const dueProgress = await prisma.userLearningProgress.findMany({
      where: {
        userId,
        nextReviewAt: { lte: new Date() },
        meaningId: { notIn: selectedMeaningIds }
      },
      orderBy: { nextReviewAt: 'asc' },
      take: remaining,
      select: { meaningId: true }
    });
    
    selectedMeaningIds = [...selectedMeaningIds, ...dueProgress.map(p => p.meaningId)];
  }
  
  // 3. 如果还不足 limit，用新词填充 (从当前词书)
  if (selectedMeaningIds.length < limit) {
    const remaining = limit - selectedMeaningIds.length;
    
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { currentBookTagId: true }
    });
    
    // getNewMeanings 内部会自动排除已学习的单词 (learnedIds)，所以不需要手动排除 selectedMeaningIds
    const newIds = await getNewMeanings(userId, user?.currentBookTagId || undefined, remaining);
    selectedMeaningIds = [...selectedMeaningIds, ...newIds];
  }
  
  if (selectedMeaningIds.length === 0) {
    return [];
  }
  
  // 4. 获取详细信息 (Word + Meaning)
  const meanings = await prisma.meaning.findMany({
    where: {
      id: { in: selectedMeaningIds }
    },
    include: {
      word: true
    }
  });
  
  // 5. 按单词去重（每个单词只保留一个词义）
  const meaningMap = new Map(meanings.map(m => [m.id, m]));
  const wordIdSeen = new Set<number>();
  const uniqueMeanings: typeof meanings = [];
  
  for (const meaningId of selectedMeaningIds) {
    const m = meaningMap.get(meaningId);
    if (m && !wordIdSeen.has(m.wordId)) {
      uniqueMeanings.push(m);
      wordIdSeen.add(m.wordId);
      
      // 如果已经达到limit，停止添加
      if (uniqueMeanings.length >= limit) {
        break;
      }
    }
  }
  
  // 6. 格式化返回
  const result = uniqueMeanings.map(m => ({
    id: m.wordId, // 使用 wordId 作为标识
    word: m.word.word,
    meaning: m.definition,
    partOfSpeech: m.partOfSpeech // 添加词性信息，方便视频生成使用
  }));

  // 7. 最终随机打乱顺序
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
    
  return result;
}

/**
 * 获取今日已学习的新单词
 * 
 * @param userId - 用户 ID
 */
export async function getTodayLearnedNewWords(userId: number) {
  const today = getBeijingToday();

  const todayProgress = await prisma.userLearningProgress.findMany({
    where: {
      userId,
      createdAt: {
        gte: today
      }
    },
    include: {
      meaning: {
        include: {
          word: true
        }
      }
    }
  });

  return todayProgress.map(p => ({
    id: p.meaning.wordId,
    word: p.meaning.word.word,
    meaning: p.meaning.definition,
    learnedAt: p.createdAt
  }));
}

/**
 * 获取今日活跃的单词 (新学 + 复习)
 * 
 * @param userId - 用户 ID
 */
export async function getTodayActiveWords(userId: number) {
  const today = getBeijingToday();

  const todayProgress = await prisma.userLearningProgress.findMany({
    where: {
      userId,
      OR: [
        { createdAt: { gte: today } },
        { lastReviewAt: { gte: today } }
      ]
    },
    include: {
      meaning: {
        include: {
          word: true
        }
      }
    }
  });

  return todayProgress.map(p => ({
    id: p.meaning.wordId,
    word: p.meaning.word.word,
    meaning: p.meaning.definition,
    learnedAt: p.lastReviewAt || p.createdAt
  }));
}
