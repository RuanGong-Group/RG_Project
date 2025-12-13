/**
 * 成就系统服务
 * 负责检测和授予用户成就
 */

import prisma from '../utils/prisma';
import { ACHIEVEMENTS, AchievementDefinition } from '../config/achievements';

/**
 * 检测结果接口
 */
export interface AchievementCheckResult {
  newAchievements: AchievementDefinition[];  // 新获得的成就
  hasNew: boolean;                           // 是否有新成就
}

/**
 * 检测打卡相关成就
 * 
 * @param userId 用户ID
 * @param consecutiveDays 当前连续打卡天数
 * @param totalCheckInDays 累计打卡天数
 * @param goalCompleted 是否完成每日目标
 * @returns 检测结果
 */
export async function checkCheckinAchievements(
  userId: number,
  consecutiveDays: number,
  totalCheckInDays: number,
  goalCompleted: boolean
): Promise<AchievementCheckResult> {
  const newAchievements: AchievementDefinition[] = [];

  try {
    // 1. 检测：初次打卡
    if (totalCheckInDays === 1) {
      const awarded = await awardAchievement(userId, ACHIEVEMENTS.FIRST_CHECKIN.key);
      if (awarded) newAchievements.push(ACHIEVEMENTS.FIRST_CHECKIN);
    }

    // 2. 检测：目标达成（每次完成目标都可以触发，但只记录一次）
    if (goalCompleted) {
      const awarded = await awardAchievement(userId, ACHIEVEMENTS.DAILY_GOAL_COMPLETE.key);
      if (awarded) newAchievements.push(ACHIEVEMENTS.DAILY_GOAL_COMPLETE);
    }

    // 3. 检测：连续7天
    if (consecutiveDays >= 7) {
      const awarded = await awardAchievement(userId, ACHIEVEMENTS.STREAK_7_DAYS.key);
      if (awarded) newAchievements.push(ACHIEVEMENTS.STREAK_7_DAYS);
    }

    // 4. 检测：连续30天
    if (consecutiveDays >= 30) {
      const awarded = await awardAchievement(userId, ACHIEVEMENTS.STREAK_30_DAYS.key);
      if (awarded) newAchievements.push(ACHIEVEMENTS.STREAK_30_DAYS);
    }

    // 5. 检测：累计100天
    if (totalCheckInDays >= 100) {
      const awarded = await awardAchievement(userId, ACHIEVEMENTS.TOTAL_100_DAYS.key);
      if (awarded) newAchievements.push(ACHIEVEMENTS.TOTAL_100_DAYS);
    }

    return {
      newAchievements,
      hasNew: newAchievements.length > 0
    };
  } catch (error) {
    console.error('检测打卡成就失败:', error);
    return { newAchievements: [], hasNew: false };
  }
}

/**
 * 检测学习相关成就
 * 
 * @param userId 用户ID
 * @param totalWordsLearned 累计学习单词数
 * @param totalWordsReviewed 累计复习单词数
 * @param sessionAccuracy 本次会话准确率（0-100）
 * @returns 检测结果
 */
export async function checkLearningAchievements(
  userId: number,
  totalWordsLearned: number,
  totalWordsReviewed: number,
  sessionAccuracy?: number
): Promise<AchievementCheckResult> {
  const newAchievements: AchievementDefinition[] = [];

  try {
    // 1. 检测：初学者（第一个单词）
    if (totalWordsLearned === 1) {
      const awarded = await awardAchievement(userId, ACHIEVEMENTS.FIRST_WORD.key);
      if (awarded) newAchievements.push(ACHIEVEMENTS.FIRST_WORD);
    }

    // 2. 检测：百词斩
    if (totalWordsLearned >= 100) {
      const awarded = await awardAchievement(userId, ACHIEVEMENTS.LEARN_100_WORDS.key);
      if (awarded) newAchievements.push(ACHIEVEMENTS.LEARN_100_WORDS);
    }

    // 3. 检测：千词王
    if (totalWordsLearned >= 1000) {
      const awarded = await awardAchievement(userId, ACHIEVEMENTS.LEARN_1000_WORDS.key);
      if (awarded) newAchievements.push(ACHIEVEMENTS.LEARN_1000_WORDS);
    }

    // 4. 检测：复习达人
    if (totalWordsReviewed >= 500) {
      const awarded = await awardAchievement(userId, ACHIEVEMENTS.REVIEW_500_WORDS.key);
      if (awarded) newAchievements.push(ACHIEVEMENTS.REVIEW_500_WORDS);
    }

    // 5. 检测：完美学习（准确率100%）
    if (sessionAccuracy !== undefined && sessionAccuracy === 100) {
      const awarded = await awardAchievement(userId, ACHIEVEMENTS.PERFECT_SESSION.key);
      if (awarded) newAchievements.push(ACHIEVEMENTS.PERFECT_SESSION);
    }

    return {
      newAchievements,
      hasNew: newAchievements.length > 0
    };
  } catch (error) {
    console.error('检测学习成就失败:', error);
    return { newAchievements: [], hasNew: false };
  }
}

/**
 * 授予成就（内部函数）
 * 使用数据库约束确保同一成就不会重复授予
 * 
 * @param userId 用户ID
 * @param achievementKey 成就唯一标识
 * @returns 是否成功授予（true=新授予，false=已存在）
 */
async function awardAchievement(userId: number, achievementKey: string): Promise<boolean> {
  try {
    await prisma.userAchievement.create({
      data: {
        userId: userId,
        achievementKey: achievementKey
      }
    });
    return true;  // 成功创建，说明是新成就
  } catch (error: any) {
    // 如果是唯一约束冲突，说明已经有该成就了
    if (error.code === 'P2002') {
      return false;
    }
    throw error;  // 其他错误继续抛出
  }
}

/**
 * 获取用户所有成就状态
 * 
 * @param userId 用户ID
 * @returns 成就列表（包含已解锁和未解锁）
 */
export async function getUserAchievements(userId: number) {
  try {
    // 获取用户已获得的成就
    const userAchievements = await prisma.userAchievement.findMany({
      where: { userId },
      orderBy: { awardedAt: 'desc' }
    });

    // 构建成就状态列表
    const achievementStatus = Object.values(ACHIEVEMENTS).map(achievement => {
      const userAchievement = userAchievements.find(ua => ua.achievementKey === achievement.key);
      return {
        ...achievement,
        unlocked: !!userAchievement,
        unlockedAt: userAchievement?.awardedAt || null
      };
    });

    // 按类别分组
    const grouped = {
      checkin: achievementStatus.filter(a => a.category === 'checkin'),
      learning: achievementStatus.filter(a => a.category === 'learning')
    };

    // 统计信息
    const stats = {
      total: achievementStatus.length,
      unlocked: achievementStatus.filter(a => a.unlocked).length,
      progress: Math.round((achievementStatus.filter(a => a.unlocked).length / achievementStatus.length) * 100)
    };

    return {
      achievements: achievementStatus,
      grouped,
      stats
    };
  } catch (error) {
    console.error('获取用户成就失败:', error);
    throw error;
  }
}

/**
 * 计算用户累计学习统计（用于成就检测）
 * 
 * @param userId 用户ID
 * @returns 累计统计数据
 */
export async function getUserLearningStats(userId: number) {
  try {
    // 统计所有打卡记录
    const checkIns = await prisma.dailyCheckIn.findMany({
      where: { userId },
      select: {
        wordsLearned: true,
        wordsReviewed: true,
        goalCompleted: true,
        consecutiveDays: true
      }
    });

    // 计算累计数据
    const totalWordsLearned = checkIns.reduce((sum, c) => sum + c.wordsLearned, 0);
    const totalWordsReviewed = checkIns.reduce((sum, c) => sum + c.wordsReviewed, 0);
    const totalCheckInDays = checkIns.filter(c => c.goalCompleted).length;
    const currentConsecutiveDays = checkIns.length > 0 
      ? Math.max(...checkIns.map(c => c.consecutiveDays))
      : 0;

    return {
      totalWordsLearned,
      totalWordsReviewed,
      totalCheckInDays,
      currentConsecutiveDays
    };
  } catch (error) {
    console.error('获取用户学习统计失败:', error);
    return {
      totalWordsLearned: 0,
      totalWordsReviewed: 0,
      totalCheckInDays: 0,
      currentConsecutiveDays: 0
    };
  }
}
