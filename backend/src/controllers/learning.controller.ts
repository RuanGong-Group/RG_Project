import { Response } from 'express';
import prisma from '../utils/prisma';
import { AuthRequest } from '../middleware/auth.middleware';
import { updateTodayCheckIn } from './checkin.controller';
import { getBeijingTime, safeJsonParse } from '../utils/datetime';

/**
 * 获取下一个待学单词（含所有词义）- 新的学习流程
 * GET /api/learning/word/next
 */
export const getNextWordToLearn = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: '用户未认证'
      });
      return;
    }

    // 1. 获取用户当前的词书和每日目标
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        currentBookTag: true
      }
    });

    if (!user || !user.currentBookTagId) {
      res.status(400).json({
        success: false,
        message: '请先选择一个词书开始学习'
      });
      return;
    }

    // 2. 检查今日学习是否已达目标（复习优先逻辑）
    const dailyGoal = user.dailyLearningGoal || 10;
    const now = getBeijingTime();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);

    // 统计今日已学单词数
    const todayNewLearning = await prisma.userLearningProgress.findMany({
      where: {
        userId,
        createdAt: {
          gte: todayStart,
          lte: todayEnd
        }
      },
      include: {
        meaning: {
          include: {
            partOfSpeech: {
              select: {
                wordId: true
              }
            }
          }
        }
      }
    });

    const todayLearnedWordIds = new Set(
      todayNewLearning.map(p => p.meaning.partOfSpeech.wordId)
    );
    const learnedCount = todayLearnedWordIds.size;

    // 统计今日已复习单词数
    const todayReviewedProgress = await prisma.userLearningProgress.findMany({
      where: {
        userId,
        lastReviewAt: {
          gte: todayStart,
          lte: todayEnd
        },
        createdAt: {
          lt: todayStart
        }
      },
      include: {
        meaning: {
          include: {
            partOfSpeech: {
              select: {
                wordId: true
              }
            }
          }
        }
      }
    });

    const todayReviewedWordIds = new Set(
      todayReviewedProgress.map(p => p.meaning.partOfSpeech.wordId)
    );
    const reviewedCount = todayReviewedWordIds.size;

    // 统计到期需要复习的单词数
    const dueReviews = await prisma.userLearningProgress.findMany({
      where: {
        userId,
        nextReviewAt: {
          lte: now
        },
        masteryLevel: {
          lt: 6
        }
      },
      include: {
        meaning: {
          include: {
            partOfSpeech: {
              select: {
                wordId: true
              }
            }
          }
        }
      }
    });

    const dueReviewWordIds = new Set(
      dueReviews.map(p => p.meaning.partOfSpeech.wordId)
    );
    const dueReviewCount = dueReviewWordIds.size;

    // 计算今日总完成数和剩余名额
    const totalCompleted = learnedCount + reviewedCount;
    const remainingSlots = dailyGoal - totalCompleted - dueReviewCount; // 减去到期复习数

    // 如果剩余名额 <= 0，说明目标已完成或需要优先复习
    if (remainingSlots <= 0 && totalCompleted >= dailyGoal) {
      res.json({
        success: true,
        message: `✅ 今日学习目标已完成！已学习 ${learnedCount} 个单词，复习 ${reviewedCount} 个单词`,
        data: null
      });
      return;
    }

    // 如果有到期复习但名额不够，提示先复习
    if (dueReviewCount > 0 && remainingSlots <= 0) {
      res.json({
        success: true,
        message: `📚 请先完成复习任务！还有 ${dueReviewCount} 个单词需要复习`,
        data: null,
        hint: 'REVIEW_FIRST'
      });
      return;
    }

    // 3. 获取该词书下的所有单词
    const wordsInBook = await prisma.wordTagRelation.findMany({
      where: {
        bookTagId: user.currentBookTagId
      },
      include: {
        word: {
          include: {
            partsOfSpeech: {
              include: {
                meanings: {
                  include: {
                    examples: {
                      include: {
                        example: true
                      },
                      orderBy: {
                        orderInMeaning: 'asc'
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });

    if (wordsInBook.length === 0) {
      res.status(404).json({
        success: false,
        message: '该词书中没有单词'
      });
      return;
    }

    // 3. 批量查询已学习的词义
    const allMeaningIds: number[] = [];
    for (const wordRelation of wordsInBook) {
      for (const pos of wordRelation.word.partsOfSpeech) {
        for (const meaning of pos.meanings) {
          allMeaningIds.push(meaning.id);
        }
      }
    }

    const learnedProgress = await prisma.userLearningProgress.findMany({
      where: {
        userId: userId,
        meaningId: { in: allMeaningIds }
      },
      select: { meaningId: true }
    });

    const learnedMeaningIds = new Set(learnedProgress.map(p => p.meaningId));

    // 4. 找到第一个有未学词义的单词
    let targetWord = null;
    let masteryFocus = 'recognition';

    for (const wordRelation of wordsInBook) {
      const word = wordRelation.word;
      
      // 检查这个单词是否有未学的词义
      let hasUnlearnedMeaning = false;
      for (const pos of word.partsOfSpeech) {
        for (const meaning of pos.meanings) {
          if (!learnedMeaningIds.has(meaning.id)) {
            hasUnlearnedMeaning = true;
            break;
          }
        }
        if (hasUnlearnedMeaning) break;
      }

      if (hasUnlearnedMeaning) {
        targetWord = word;
        masteryFocus = wordRelation.masteryFocus;
        break;
      }
    }

    // 5. 如果所有单词都学完了
    if (!targetWord) {
      res.json({
        success: true,
        message: '恭喜！您已经学习完该词书的所有单词',
        data: null
      });
      return;
    }

    // 6. 格式化单词的所有词义
    const meanings = [];
    for (const pos of targetWord.partsOfSpeech) {
      for (const meaning of pos.meanings) {
        // 只返回未学的词义
        if (!learnedMeaningIds.has(meaning.id)) {
          const examples = meaning.examples.map(rel => ({
            id: rel.example.id,
            sentence: rel.example.sentence,
            highlightWord: rel.highlightWord,
            source: rel.example.source,
            difficulty: rel.example.difficulty
          }));

          meanings.push({
            meaningId: meaning.id,
            partOfSpeech: pos.partOfSpeech,
            definition: meaning.definition,
            relatedInfo: safeJsonParse(meaning.relatedInfo, null),
            examples: examples
          });
        }
      }
    }

    // 7. 返回完整的单词数据
    res.json({
      success: true,
      message: '获取待学单词成功',
      data: {
        wordId: targetWord.id,
        word: targetWord.word,
        pronunciation: safeJsonParse(targetWord.pronunciation, { uk: '', us: '' }),
        meanings: meanings,
        totalMeanings: meanings.length,
        masteryFocus: masteryFocus,
        bookTag: user.currentBookTag?.tagName
      }
    });

  } catch (error) {
    console.error('获取待学单词错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
};

/**
 * 旧的获取下一个学习内容接口（保留兼容）
 * GET /api/learning/next
 */
export const getNextLearningContent = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: '用户未认证'
      });
      return;
    }

    // 1. 获取用户当前的词书
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        currentBookTag: true
      }
    });

    if (!user || !user.currentBookTagId) {
      res.status(400).json({
        success: false,
        message: '请先选择一个词书开始学习'
      });
      return;
    }

    // 2. 获取该词书下的所有单词
    const wordsInBook = await prisma.wordTagRelation.findMany({
      where: {
        bookTagId: user.currentBookTagId
      },
      include: {
        word: {
          include: {
            partsOfSpeech: {
              include: {
                meanings: {
                  include: {
                    examples: {
                      include: {
                        example: true
                      },
                      orderBy: {
                        orderInMeaning: 'asc'
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });

    if (wordsInBook.length === 0) {
      res.status(404).json({
        success: false,
        message: '该词书中没有单词'
      });
      return;
    }

    // 3. 批量查询用户已学习的所有词义ID，避免循环查询
    const allMeaningIds: number[] = [];
    for (const wordRelation of wordsInBook) {
      for (const pos of wordRelation.word.partsOfSpeech) {
        for (const meaning of pos.meanings) {
          allMeaningIds.push(meaning.id);
        }
      }
    }

    const learnedProgress = await prisma.userLearningProgress.findMany({
      where: {
        userId: userId,
        meaningId: { in: allMeaningIds }
      },
      select: { meaningId: true }
    });

    // 4. 用Set缓存已学习的meaningId，O(1)时间查找
    const learnedMeaningIds = new Set(learnedProgress.map(p => p.meaningId));

    // 5. 查找第一个未学习的词义
    let nextMeaning = null;
    let wordData = null;
    let masteryFocus = 'recognition';

    for (const wordRelation of wordsInBook) {
      const word = wordRelation.word;
      masteryFocus = wordRelation.masteryFocus;

      // 遍历该单词的所有词义
      for (const pos of word.partsOfSpeech) {
        for (const meaning of pos.meanings) {
          // 从Set中快速检查是否已学习
          if (!learnedMeaningIds.has(meaning.id)) {
            nextMeaning = meaning;
            wordData = {
              word: word.word,
              pronunciation: safeJsonParse(word.pronunciation, { uk: '', us: '' }),
              partOfSpeech: pos.partOfSpeech,
              masteryFocus: masteryFocus
            };
            break;
          }
        }
        if (nextMeaning) break;
      }
      if (nextMeaning) break;
    }

    // 6. 如果所有词义都学过了，返回提示
    if (!nextMeaning || !wordData) {
      res.json({
        success: true,
        message: '恭喜！您已经学习完该词书的所有内容',
        data: null
      });
      return;
    }

    // 7. 格式化例句数据
    const examples = nextMeaning.examples.map(rel => ({
      id: rel.example.id,
      sentence: rel.example.sentence,
      highlightWord: rel.highlightWord,
      source: rel.example.source,
      difficulty: rel.example.difficulty
    }));

    // 8. 返回学习内容
    res.json({
      success: true,
      message: '获取学习内容成功',
      data: {
        meaningId: nextMeaning.id,
        word: wordData.word,
        pronunciation: wordData.pronunciation,
        partOfSpeech: wordData.partOfSpeech,
        definition: nextMeaning.definition,
        relatedInfo: safeJsonParse(nextMeaning.relatedInfo, null),
        examples: examples,
        masteryFocus: wordData.masteryFocus,
        bookTag: user.currentBookTag?.tagName
      }
    });

  } catch (error) {
    console.error('获取学习内容错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
};

/**
 * 更新学习进度
 * POST /api/learning/progress
 */
export const updateLearningProgress = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const { meaningId, isCorrect } = req.body;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: '用户未认证'
      });
      return;
    }

    // 验证输入
    if (!meaningId) {
      res.status(400).json({
        success: false,
        message: 'meaningId 不能为空'
      });
      return;
    }

    if (typeof isCorrect !== 'boolean') {
      res.status(400).json({
        success: false,
        message: 'isCorrect 必须为布尔值'
      });
      return;
    }

    // 查找或创建学习进度记录
    let progress = await prisma.userLearningProgress.findUnique({
      where: {
        userId_meaningId: {
          userId: userId,
          meaningId: meaningId
        }
      }
    });

    const now = getBeijingTime();
    let newMasteryLevel = 0;
    let newConsecutiveCorrect = 0;
    let reviewCount = 0;

    if (progress) {
      // 已有进度，更新
      reviewCount = progress.reviewCount + 1;
      
      if (isCorrect) {
        newConsecutiveCorrect = progress.consecutiveCorrect + 1;
        newMasteryLevel = Math.min(progress.masteryLevel + 1, 5);
      } else {
        newConsecutiveCorrect = 0;
        newMasteryLevel = Math.max(progress.masteryLevel - 1, 0);
      }
    } else {
      // 新词义，首次学习
      reviewCount = 1;
      if (isCorrect) {
        newConsecutiveCorrect = 1;
        newMasteryLevel = 1;
      } else {
        newConsecutiveCorrect = 0;
        newMasteryLevel = 0;
      }
    }

    // 计算下次复习时间（艾宾浩斯记忆曲线）
    const nextReviewAt = calculateNextReviewTime(now, newMasteryLevel);

    // 更新或创建进度记录
    progress = await prisma.userLearningProgress.upsert({
      where: {
        userId_meaningId: {
          userId: userId,
          meaningId: meaningId
        }
      },
      update: {
        masteryLevel: newMasteryLevel,
        lastReviewAt: now,
        nextReviewAt: nextReviewAt,
        reviewCount: reviewCount,
        consecutiveCorrect: newConsecutiveCorrect,
        updatedAt: now
      },
      create: {
        userId: userId,
        meaningId: meaningId,
        masteryLevel: newMasteryLevel,
        lastReviewAt: now,
        nextReviewAt: nextReviewAt,
        reviewCount: reviewCount,
        consecutiveCorrect: newConsecutiveCorrect
      }
    });

    // 更新每日打卡信息（学习）
    // 只在首次学习该词义时增加词义级别的学习计数
    if (reviewCount === 1) {
      await updateTodayCheckIn(userId, 'learn-meaning', { meaningId: meaningId });
    }

    res.json({
      success: true,
      message: '学习进度更新成功',
      data: {
        masteryLevel: progress.masteryLevel,
        nextReviewAt: progress.nextReviewAt,
        consecutiveCorrect: progress.consecutiveCorrect,
        reviewCount: progress.reviewCount
      }
    });

  } catch (error) {
    console.error('更新学习进度错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
};

/**
 * 获取今日待复习内容
 * GET /api/learning/review/today
 */
export const getTodayReviewContent = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: '用户未认证'
      });
      return;
    }

    // 1. 获取用户当前学习的词书
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        currentBookTag: true
      }
    });

    if (!user || !user.currentBookTagId) {
      res.status(400).json({
        success: false,
        message: '请先选择一个词书开始学习'
      });
      return;
    }

    const now = getBeijingTime();

    // 2. 查询今日需要复习的词义（next_review_at <= now 且未完全掌握）
    const reviewProgressList = await prisma.userLearningProgress.findMany({
      where: {
        userId: userId,
        nextReviewAt: {
          lte: now
        },
        masteryLevel: {
          lt: 6 // 只返回未完全掌握的词义
        }
      },
      include: {
        meaning: {
          include: {
            partOfSpeech: {
              include: {
                word: true
              }
            },
            examples: {
              include: {
                example: true
              },
              orderBy: {
                orderInMeaning: 'asc'
              }
            }
          }
        }
      },
      orderBy: {
        nextReviewAt: 'asc'
      }
    });

    if (reviewProgressList.length === 0) {
      res.json({
        success: true,
        message: '今日暂无需要复习的内容',
        data: {
          totalReviews: 0,
          reviews: []
        }
      });
      return;
    }

    // 3. 批量查询所有wordId的masteryFocus，避免循环查询数据库
    const wordIds = reviewProgressList.map(p => p.meaning.partOfSpeech.word.id);
    const wordTagRelations = await prisma.wordTagRelation.findMany({
      where: {
        wordId: { in: wordIds },
        bookTagId: user.currentBookTagId
      }
    });

    // 4. 用Map缓存wordId到masteryFocus的映射，O(1)时间查找
    const wordTagMap = new Map(
      wordTagRelations.map(r => [r.wordId, r.masteryFocus])
    );

    // 5. 格式化复习内容，从Map中直接获取masteryFocus
    const reviews = [];
    
    for (const progress of reviewProgressList) {
      const meaning = progress.meaning;
      const partOfSpeech = meaning.partOfSpeech;
      const word = partOfSpeech.word;

      // 从Map中快速获取masteryFocus，避免重复查询数据库
      const masteryFocus = wordTagMap.get(word.id);

      // 如果找不到关联关系，说明数据有问题，跳过
      if (!masteryFocus) {
        console.warn(`警告：词义 ${meaning.id} 的单词 ${word.id} 在当前词书 ${user.currentBookTagId} 中找不到关联关系`);
        continue;
      }

      // 格式化例句数据
      const examples = meaning.examples.map(rel => ({
        id: rel.example.id,
        sentence: rel.example.sentence,
        highlightWord: rel.highlightWord,
        source: rel.example.source,
        difficulty: rel.example.difficulty
      }));

      reviews.push({
        progressId: progress.id,
        meaningId: meaning.id,
        word: word.word,
        wordId: word.id, // 添加wordId用于后续打乱排序
        pronunciation: safeJsonParse(word.pronunciation, { uk: '', us: '' }),
        partOfSpeech: partOfSpeech.partOfSpeech,
        definition: meaning.definition,
        relatedInfo: safeJsonParse(meaning.relatedInfo, null),
        examples: examples,
        reviewMode: masteryFocus, // 'recognition' 或 'production'
        masteryLevel: progress.masteryLevel,
        reviewCount: progress.reviewCount
      });
    }

    // 6. 打乱复习顺序，避免同一单词的多个词义连续出现
    // 策略：按wordId分组，然后交替取出不同单词的词义
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
    res.status(500).json({
      success: false,
      message: '服务器错误',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
};

/**
 * 提交复习结果
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
      res.status(401).json({
        success: false,
        message: '用户未认证'
      });
      return;
    }

    // 验证输入
    if (!meaningId) {
      res.status(400).json({
        success: false,
        message: 'meaningId 不能为空'
      });
      return;
    }

    if (typeof isCorrect !== 'boolean') {
      res.status(400).json({
        success: false,
        message: 'isCorrect 必须为布尔值'
      });
      return;
    }

    // 查找学习进度记录
    const progress = await prisma.userLearningProgress.findUnique({
      where: {
        userId_meaningId: {
          userId: userId,
          meaningId: meaningId
        }
      }
    });

    if (!progress) {
      res.status(404).json({
        success: false,
        message: '未找到该词义的学习进度'
      });
      return;
    }

    const now = getBeijingTime();
    let newMasteryLevel = progress.masteryLevel;
    let newConsecutiveCorrect = progress.consecutiveCorrect;

    // 更新掌握程度
    if (isCorrect) {
      newConsecutiveCorrect = progress.consecutiveCorrect + 1;
      newMasteryLevel = Math.min(progress.masteryLevel + 1, 5);
    } else {
      newConsecutiveCorrect = 0;
      newMasteryLevel = Math.max(progress.masteryLevel - 1, 0);
    }

    // 计算下次复习时间
    const nextReviewAt = calculateNextReviewTime(now, newMasteryLevel);

    // 更新进度记录
    const updatedProgress = await prisma.userLearningProgress.update({
      where: {
        userId_meaningId: {
          userId: userId,
          meaningId: meaningId
        }
      },
      data: {
        masteryLevel: newMasteryLevel,
        lastReviewAt: now,
        nextReviewAt: nextReviewAt,
        reviewCount: progress.reviewCount + 1,
        consecutiveCorrect: newConsecutiveCorrect,
        updatedAt: now
      }
    });

    // 更新每日打卡信息（复习，词义级别）
    await updateTodayCheckIn(userId, 'review-meaning', { meaningId: meaningId });

    res.json({
      success: true,
      message: '复习结果提交成功',
      data: {
        meaningId: meaningId,
        isCorrect: isCorrect,
        masteryLevel: updatedProgress.masteryLevel,
        nextReviewAt: updatedProgress.nextReviewAt,
        consecutiveCorrect: updatedProgress.consecutiveCorrect,
        reviewCount: updatedProgress.reviewCount
      }
    });

  } catch (error) {
    console.error('提交复习结果错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
};

/**
 * 打乱复习顺序，避免同一单词的多个词义连续出现
 * 策略：按单词分组，然后交替取出不同单词的词义
 * @param reviews 原始复习列表
 * @returns 打乱后的复习列表
 */
function shuffleReviewsByWord(reviews: any[]): any[] {
  if (reviews.length <= 1) return reviews;

  // 1. 按wordId分组
  const groupByWord = new Map<number, any[]>();
  for (const review of reviews) {
    const wordId = review.wordId;
    if (!groupByWord.has(wordId)) {
      groupByWord.set(wordId, []);
    }
    groupByWord.get(wordId)!.push(review);
  }

  // 2. 如果只有一个单词，直接返回（无法打乱）
  if (groupByWord.size === 1) {
    return reviews;
  }

  // 3. 将分组转为数组，方便操作
  const wordGroups = Array.from(groupByWord.values());

  // 4. 交替取出不同单词的词义
  const result: any[] = [];
  let maxIterations = reviews.length; // 防止死循环
  let iterations = 0;

  while (result.length < reviews.length && iterations < maxIterations) {
    iterations++;

    // 遍历每个单词组，每次取一个词义
    for (const group of wordGroups) {
      if (group.length > 0) {
        result.push(group.shift()!); // 取出第一个词义
      }
    }
  }

  // 5. 移除临时添加的wordId字段
  return result.map(({ wordId, ...rest }) => rest);
}

/**
 * 计算下次复习时间（基于艾宾浩斯记忆曲线）
 * @param now 当前时间
 * @param masteryLevel 掌握程度 (0-5)
 * @returns 下次复习时间
 */
function calculateNextReviewTime(now: Date, masteryLevel: number): Date {
  const intervals = [
    5 * 60 * 1000,        // 等级0: 5分钟后
    30 * 60 * 1000,       // 等级1: 30分钟后
    12 * 60 * 60 * 1000,  // 等级2: 12小时后
    24 * 60 * 60 * 1000,  // 等级3: 1天后
    2 * 24 * 60 * 60 * 1000,   // 等级4: 2天后
    7 * 24 * 60 * 60 * 1000    // 等级5: 7天后
  ];

  const interval = intervals[masteryLevel] || intervals[0];
  return new Date(now.getTime() + interval);
}

/**
 * 提交单个词义的学习结果（新的学习流程）
 * POST /api/learning/meaning/submit
 */
export const submitMeaningResult = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const { meaningId, isCorrect } = req.body;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: '用户未认证'
      });
      return;
    }

    // 验证输入
    if (!meaningId) {
      res.status(400).json({
        success: false,
        message: 'meaningId 不能为空'
      });
      return;
    }

    if (typeof isCorrect !== 'boolean') {
      res.status(400).json({
        success: false,
        message: 'isCorrect 必须为布尔值'
      });
      return;
    }

    // 查找或创建学习进度记录
    let progress = await prisma.userLearningProgress.findUnique({
      where: {
        userId_meaningId: {
          userId: userId,
          meaningId: meaningId
        }
      }
    });

    const now = getBeijingTime();
    let newMasteryLevel = 0;
    let newConsecutiveCorrect = 0;
    let reviewCount = 0;

    if (progress) {
      // 已有进度，更新
      reviewCount = progress.reviewCount + 1;
      
      if (isCorrect) {
        newConsecutiveCorrect = progress.consecutiveCorrect + 1;
        newMasteryLevel = Math.min(progress.masteryLevel + 1, 5);
      } else {
        newConsecutiveCorrect = 0;
        newMasteryLevel = Math.max(progress.masteryLevel - 1, 0);
      }
    } else {
      // 新词义，首次学习
      reviewCount = 1;
      if (isCorrect) {
        newConsecutiveCorrect = 1;
        newMasteryLevel = 1;
      } else {
        newConsecutiveCorrect = 0;
        newMasteryLevel = 0;
      }
    }

    // 计算下次复习时间
    const nextReviewAt = calculateNextReviewTime(now, newMasteryLevel);

    // 更新或创建进度记录
    progress = await prisma.userLearningProgress.upsert({
      where: {
        userId_meaningId: {
          userId: userId,
          meaningId: meaningId
        }
      },
      update: {
        masteryLevel: newMasteryLevel,
        lastReviewAt: now,
        nextReviewAt: nextReviewAt,
        reviewCount: reviewCount,
        consecutiveCorrect: newConsecutiveCorrect,
        updatedAt: now
      },
      create: {
        userId: userId,
        meaningId: meaningId,
        masteryLevel: newMasteryLevel,
        lastReviewAt: now,
        nextReviewAt: nextReviewAt,
        reviewCount: reviewCount,
        consecutiveCorrect: newConsecutiveCorrect
      }
    });

    res.json({
      success: true,
      message: '词义学习结果提交成功',
      data: {
        meaningId: meaningId,
        isCorrect: isCorrect,
        masteryLevel: progress.masteryLevel,
        nextReviewAt: progress.nextReviewAt,
        consecutiveCorrect: progress.consecutiveCorrect,
        reviewCount: progress.reviewCount
      }
    });

  } catch (error) {
    console.error('提交词义学习结果错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
};

/**
 * 标记单词学习完成（所有词义都已学习）
 * POST /api/learning/word/complete
 */
export const completeWordLearning = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const { wordId } = req.body;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: '用户未认证'
      });
      return;
    }

    if (!wordId) {
      res.status(400).json({
        success: false,
        message: 'wordId 不能为空'
      });
      return;
    }

    // 获取该单词的所有词义
    const word = await prisma.word.findUnique({
      where: { id: wordId },
      include: {
        partsOfSpeech: {
          include: {
            meanings: true
          }
        }
      }
    });

    if (!word) {
      res.status(404).json({
        success: false,
        message: '单词不存在'
      });
      return;
    }

    // 收集所有词义ID
    const meaningIds: number[] = [];
    for (const pos of word.partsOfSpeech) {
      for (const meaning of pos.meanings) {
        meaningIds.push(meaning.id);
      }
    }

    // 检查所有词义是否都已学习
    const learnedMeanings = await prisma.userLearningProgress.findMany({
      where: {
        userId: userId,
        meaningId: { in: meaningIds }
      }
    });

    if (learnedMeanings.length !== meaningIds.length) {
      res.status(400).json({
        success: false,
        message: '该单词还有词义未学习完成'
      });
      return;
    }

    // 更新打卡记录（按单词计数，并传递词义数量）
    await updateTodayCheckIn(userId, 'learn', {
      wordId: wordId,
      meaningCount: meaningIds.length
    });

    res.json({
      success: true,
      message: '单词学习完成',
      data: {
        wordId: wordId,
        word: word.word,
        totalMeanings: meaningIds.length,
        learnedMeanings: learnedMeanings.length
      }
    });

  } catch (error) {
    console.error('标记单词学习完成错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
};

/**
 * 获取今日学习计划（智能分配）
 * GET /api/learning/today-plan
 * 
 * 返回今日的学习计划：
 * - 优先分配到期的复习任务（艾宾浩斯算法）
 * - 剩余名额分配给新学习任务
 * - 基于用户的每日目标（dailyLearningGoal）
 */
export const getTodayLearningPlan = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: '用户未认证'
      });
      return;
    }

    // 1. 获取用户信息和每日目标
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        dailyLearningGoal: true,
        currentBookTagId: true,
        currentBookTag: {
          select: {
            id: true,
            tagName: true
          }
        }
      }
    });

    if (!user) {
      res.status(404).json({
        success: false,
        message: '用户不存在'
      });
      return;
    }

    const dailyGoal = user.dailyLearningGoal || 10; // 默认10个单词
    const now = getBeijingTime();

    // 2. 统计今日已完成的学习
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);

    // 今日新学习的词义
    const todayNewLearning = await prisma.userLearningProgress.findMany({
      where: {
        userId,
        createdAt: {
          gte: todayStart,
          lte: todayEnd
        }
      },
      include: {
        meaning: {
          include: {
            partOfSpeech: {
              select: {
                wordId: true
              }
            }
          }
        }
      }
    });

    // 按单词去重统计今日学习数
    const todayLearnedWordIds = new Set(
      todayNewLearning.map(p => p.meaning.partOfSpeech.wordId)
    );
    const learnedCount = todayLearnedWordIds.size;

    // 统计今日已复习的词义（已完成复习且 lastReviewAt 在今天）
    const todayReviewedProgress = await prisma.userLearningProgress.findMany({
      where: {
        userId,
        lastReviewAt: {
          gte: todayStart,
          lte: todayEnd
        },
        createdAt: {
          lt: todayStart // 不是今天创建的（排除今天新学的）
        }
      },
      include: {
        meaning: {
          include: {
            partOfSpeech: {
              select: {
                wordId: true
              }
            }
          }
        }
      }
    });

    // 按单词去重统计今日复习数
    const todayReviewedWordIds = new Set(
      todayReviewedProgress.map(p => p.meaning.partOfSpeech.wordId)
    );
    const reviewedCount = todayReviewedWordIds.size;

    // 3. 获取到期的复习任务（按词义统计）
    const dueReviews = await prisma.userLearningProgress.findMany({
      where: {
        userId,
        nextReviewAt: {
          lte: now
        },
        masteryLevel: {
          lt: 6 // 未完全掌握的词义
        }
      },
      include: {
        meaning: {
          include: {
            partOfSpeech: {
              include: {
                word: {
                  select: {
                    id: true,
                    word: true
                  }
                }
              }
            }
          }
        }
      },
      orderBy: {
        nextReviewAt: 'asc' // 最早到期的优先
      }
    });

    // 按单词分组统计到期复习
    const dueReviewsByWord = new Map<number, {
      wordId: number;
      word: string;
      dueMeanings: number;
      totalMeanings: number;
    }>();

    for (const review of dueReviews) {
      const wordId = review.meaning.partOfSpeech.word.id;
      const word = review.meaning.partOfSpeech.word.word;

      if (!dueReviewsByWord.has(wordId)) {
        // 获取该单词的总词义数
        const totalMeanings = await prisma.meaning.count({
          where: { 
            partOfSpeech: {
              wordId
            }
          }
        });

        dueReviewsByWord.set(wordId, {
          wordId,
          word,
          dueMeanings: 1,
          totalMeanings
        });
      } else {
        const existing = dueReviewsByWord.get(wordId)!;
        existing.dueMeanings += 1;
      }
    }

    const dueReviewWords = Array.from(dueReviewsByWord.values());
    const reviewCount = dueReviewWords.length;

    // 4. 计算新学习配额（复习优先）
    // 总目标 - 到期复习数 = 新学配额
    // 但同时要考虑已完成的数量
    const totalCompleted = learnedCount + reviewedCount;
    const remainingGoal = Math.max(0, dailyGoal - totalCompleted);
    
    // 优先保证复习，剩余名额给新学
    const newLearningQuota = Math.max(0, remainingGoal - reviewCount);

    // 5. 获取可学习的新单词（如果还有配额）
    let availableNewWords: Array<{
      wordId: number;
      word: string;
      totalMeanings: number;
    }> = [];

    if (newLearningQuota > 0 && user.currentBookTagId) {
      // 获取该词书下的所有单词
      const wordsInBook = await prisma.wordTagRelation.findMany({
        where: {
          bookTagId: user.currentBookTagId
        },
        select: {
          wordId: true
        }
      });

      const wordIdsInBook = wordsInBook.map(w => w.wordId);

      // 获取词书中所有单词的所有词义
      const allWordsInBook = await prisma.word.findMany({
        where: {
          id: { in: wordIdsInBook }
        },
        include: {
          partsOfSpeech: {
            include: {
              meanings: {
                select: {
                  id: true
                }
              }
            }
          }
        }
      });

      // 收集所有词义ID
      const allMeaningIdsInBook: number[] = [];
      const wordMeaningMap = new Map<number, number[]>(); // wordId -> meaningIds[]
      
      for (const word of allWordsInBook) {
        const meaningIds: number[] = [];
        for (const pos of word.partsOfSpeech) {
          for (const meaning of pos.meanings) {
            allMeaningIdsInBook.push(meaning.id);
            meaningIds.push(meaning.id);
          }
        }
        wordMeaningMap.set(word.id, meaningIds);
      }

      // 获取已学习的词义
      const learnedProgress = await prisma.userLearningProgress.findMany({
        where: {
          userId,
          meaningId: { in: allMeaningIdsInBook }
        },
        select: {
          meaningId: true
        }
      });

      const learnedMeaningIds = new Set(learnedProgress.map(p => p.meaningId));

      // 筛选有未学词义的单词（包括部分学习的单词）
      const unlearnedWordIds = wordIdsInBook.filter(wordId => {
        const meaningIds = wordMeaningMap.get(wordId) || [];
        // 只要有一个词义未学，就算未学完
        return meaningIds.some(meaningId => !learnedMeaningIds.has(meaningId));
      });

      if (unlearnedWordIds.length > 0) {
        // 获取前 newLearningQuota 个单词的详细信息
        const newWords = await prisma.word.findMany({
          where: {
            id: {
              in: unlearnedWordIds.slice(0, newLearningQuota)
            }
          },
          include: {
            partsOfSpeech: {
              include: {
                meanings: {
                  select: {
                    id: true
                  }
                }
              }
            }
          }
        });

        availableNewWords = newWords.map(w => {
          let totalMeanings = 0;
          for (const pos of w.partsOfSpeech) {
            totalMeanings += pos.meanings.length;
          }
          return {
            wordId: w.id,
            word: w.word,
            totalMeanings
          };
        });
      }
    }

    // 6. 构建返回数据
    const planData = {
      dailyGoal,
      progress: {
        learned: learnedCount,
        reviewed: reviewedCount,
        total: learnedCount + reviewedCount
      },
      review: {
        dueCount: reviewCount,
        words: dueReviewWords.slice(0, 20) // 最多返回20个待复习单词
      },
      newLearning: {
        quota: newLearningQuota,
        available: availableNewWords.length,
        words: availableNewWords.slice(0, 10) // 最多返回10个新单词
      },
      allocation: {
        reviewPriority: reviewCount,
        newLearningSlots: Math.min(newLearningQuota, availableNewWords.length),
        totalPlanned: Math.min(reviewCount + newLearningQuota, dailyGoal)
      }
    };

    res.json({
      success: true,
      message: '获取今日学习计划成功',
      data: planData
    });

  } catch (error) {
    console.error('获取今日学习计划错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
};
