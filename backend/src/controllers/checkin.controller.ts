/**
 * 打卡系统控制器
 * 处理用户每日打卡相关功能
 */

import { Response } from 'express';
import prisma from '../utils/prisma';
import { AuthRequest } from '../middleware/auth.middleware';
import { getBeijingToday, getBeijingYesterday, getBeijingDaysAgo } from '../utils/datetime';
import { logCriticalError } from '../utils/logger';

/**
 * 获取今日打卡状态
 * GET /api/checkin/today
 * 
 * 返回数据：
 * - 是否已打卡
 * - 今日学习单词数
 * - 今日复习单词数
 * - 当前连续打卡天数
 */
export const getTodayCheckIn = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: '用户未认证'
      });
      return;
    }

    // 获取今日日期（北京时间，只保留日期部分）
    const today = getBeijingToday();

    // 查找今日打卡记录
    const todayCheckIn = await prisma.dailyCheckIn.findUnique({
      where: {
        userId_checkInDate: {
          userId: userId,
          checkInDate: today
        }
      }
    });

    if (todayCheckIn) {
      // 今日已打卡
      res.json({
        success: true,
        message: '今日已打卡',
        data: {
          checkedIn: true,
          checkInDate: todayCheckIn.checkInDate,
          wordsLearned: todayCheckIn.wordsLearned,
          wordsReviewed: todayCheckIn.wordsReviewed,
          meaningsLearned: todayCheckIn.meaningsLearned,
          meaningsReviewed: todayCheckIn.meaningsReviewed,
          dailyGoal: todayCheckIn.dailyGoal,
          goalCompleted: todayCheckIn.goalCompleted,
          consecutiveDays: todayCheckIn.consecutiveDays
        }
      });
    } else {
      // 今日未打卡
      // 获取用户的每日目标
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { dailyLearningGoal: true }
      });

      res.json({
        success: true,
        message: '今日未打卡',
        data: {
          checkedIn: false,
          checkInDate: today,
          wordsLearned: 0,
          wordsReviewed: 0,
          meaningsLearned: 0,
          meaningsReviewed: 0,
          dailyGoal: user?.dailyLearningGoal || 10,
          goalCompleted: false,
          consecutiveDays: 0
        }
      });
    }
  } catch (error) {
    console.error('获取今日打卡状态失败:', error);
    res.status(500).json({
      success: false,
      message: '获取打卡状态失败'
    });
  }
};

/**
 * 获取打卡历史
 * GET /api/checkin/history
 * 
 * 查询参数：
 * - days: 查询最近N天的记录（默认30天）
 * 
 * 返回数据：
 * - 打卡记录列表（按日期倒序）
 * - 总打卡天数
 * - 最长连续打卡天数
 */
export const getCheckInHistory = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: '用户未认证'
      });
      return;
    }

    // 获取查询天数参数（默认30天）
    const days = parseInt(req.query.days as string) || 30;

    // 计算起始日期（北京时间）
    const startDate = getBeijingDaysAgo(days);

    // 查询打卡记录
    const checkIns = await prisma.dailyCheckIn.findMany({
      where: {
        userId: userId,
        checkInDate: {
          gte: startDate
        }
      },
      orderBy: {
        checkInDate: 'desc'
      }
    });

    // 计算统计数据
    const totalCheckInDays = checkIns.length;
    
    // 计算最长连续打卡天数
    let maxConsecutiveDays = 0;
    if (checkIns.length > 0) {
      // 按日期正序排序来计算连续天数
      const sortedCheckIns = [...checkIns].sort((a, b) => 
        a.checkInDate.getTime() - b.checkInDate.getTime()
      );
      
      let currentStreak = 1;
      for (let i = 1; i < sortedCheckIns.length; i++) {
        const prevDate = new Date(sortedCheckIns[i - 1].checkInDate);
        const currDate = new Date(sortedCheckIns[i].checkInDate);
        
        // 计算日期差（天数）
        const dayDiff = Math.floor((currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));
        
        if (dayDiff === 1) {
          // 连续的
          currentStreak++;
          maxConsecutiveDays = Math.max(maxConsecutiveDays, currentStreak);
        } else {
          // 不连续，重置计数
          currentStreak = 1;
        }
      }
      maxConsecutiveDays = Math.max(maxConsecutiveDays, currentStreak);
    }

    res.json({
      success: true,
      message: '获取打卡历史成功',
      data: {
        checkIns: checkIns,
        statistics: {
          totalCheckInDays: totalCheckInDays,
          maxConsecutiveDays: maxConsecutiveDays,
          queryDays: days
        }
      }
    });
  } catch (error) {
    console.error('获取打卡历史失败:', error);
    res.status(500).json({
      success: false,
      message: '获取打卡历史失败'
    });
  }
};

/**
 * 更新或创建今日打卡记录（内部辅助函数）
 * 在学习或复习时自动调用
 * 
 * @param userId 用户ID
 * @param type 'learn' | 'review'
 */
/**
 * 更新今日打卡信息（内部函数，供其他控制器调用）
 * 
 * @param userId 用户ID
 * @param type 操作类型：'learn' | 'review' | 'learn-meaning' | 'review-meaning'
 * @param metadata 元数据：{ wordId?: number, meaningId?: number, isFirstTime?: boolean }
 * 
 * 新的计数逻辑：
 * - wordsLearned/wordsReviewed: 单词级别计数，用于目标判定和用户展示
 * - meaningsLearned/meaningsReviewed: 词义级别计数，用于精确跟踪
 * - goalCompleted: 严格模式判定（wordsLearned >= dailyGoal）
 */
export const updateTodayCheckIn = async (
  userId: number,
  type: 'learn' | 'review' | 'learn-meaning' | 'review-meaning',
  metadata?: {
    wordId?: number;
    meaningId?: number;
    meaningCount?: number; // 该单词的总词义数
  }
): Promise<void> => {
  try {
    // 获取今日日期（北京时间）
    const today = getBeijingToday();

    // 获取用户的每日目标
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { dailyLearningGoal: true }
    });

    const dailyGoal = user?.dailyLearningGoal || 10;

    // 根据操作类型决定更新哪些字段
    let updateData: any = {};
    let createData: any = {
      userId: userId,
      checkInDate: today,
      wordsLearned: 0,
      wordsReviewed: 0,
      meaningsLearned: 0,
      meaningsReviewed: 0,
      dailyGoal: dailyGoal,
      goalCompleted: false,
      consecutiveDays: await calculateConsecutiveDays(userId, dailyGoal)
    };

    if (type === 'learn') {
      // 单词学习完成（所有词义都学完了）
      updateData = {
        wordsLearned: { increment: 1 },
        meaningsLearned: { increment: metadata?.meaningCount || 1 }
      };
      createData.wordsLearned = 1;
      createData.meaningsLearned = metadata?.meaningCount || 1;
    } else if (type === 'review') {
      // 单词复习完成
      updateData = {
        wordsReviewed: { increment: 1 },
        meaningsReviewed: { increment: metadata?.meaningCount || 1 }
      };
      createData.wordsReviewed = 1;
      createData.meaningsReviewed = metadata?.meaningCount || 1;
    } else if (type === 'learn-meaning') {
      // 单个词义学习（不增加单词计数）
      updateData = {
        meaningsLearned: { increment: 1 }
      };
      createData.meaningsLearned = 1;
    } else if (type === 'review-meaning') {
      // 单个词义复习
      updateData = {
        meaningsReviewed: { increment: 1 }
      };
      createData.meaningsReviewed = 1;
    }

    // 执行 upsert 操作
    await prisma.dailyCheckIn.upsert({
      where: {
        userId_checkInDate: {
          userId: userId,
          checkInDate: today
        }
      },
      update: updateData,
      create: createData
    });

    // 检查是否完成目标（异步更新，不阻塞主流程）
    if (type === 'learn' || type === 'review') {
      // 获取最新的打卡记录
      const latestCheckIn = await prisma.dailyCheckIn.findUnique({
        where: {
          userId_checkInDate: {
            userId: userId,
            checkInDate: today
          }
        }
      });

      if (latestCheckIn) {
        const goalCompleted = latestCheckIn.wordsLearned >= dailyGoal;
        
        // 如果目标状态发生变化，更新
        if (latestCheckIn.goalCompleted !== goalCompleted) {
          await prisma.dailyCheckIn.update({
            where: {
              userId_checkInDate: {
                userId: userId,
                checkInDate: today
              }
            },
            data: {
              goalCompleted: goalCompleted,
              // 如果刚完成目标，重新计算连续天数
              consecutiveDays: goalCompleted 
                ? await calculateConsecutiveDays(userId, dailyGoal)
                : latestCheckIn.consecutiveDays
            }
          });
        }
      }
    }
  } catch (error) {
    // 🚨 关键错误：打卡失败会导致统计数据丢失
    logCriticalError(
      'CHECKIN_UPDATE_FAILED',
      error instanceof Error ? error : new Error(String(error)),
      {
        userId,
        operation: type,
        metadata,
        impact: '用户的学习统计数据可能未被正确记录',
        recommendation: '检查数据库连接状态和表结构'
      }
    );
    
    // TODO: 未来改进方向
    // 1. 实现重试机制（3次重试，指数退避）
    // 2. 记录到失败队列表（DailyCheckInFailureLog），定时任务补偿
    // 3. 发送告警通知（邮件/短信/企业微信）
    // 4. 提供管理后台查看失败记录
    // 
    // 当前策略：详细记录日志，不阻断主流程
    // 原因：学习/复习成功比打卡记录更重要，避免影响用户体验
  }
};

/**
 * 计算连续打卡天数（内部辅助函数）
 * 
 * @param userId 用户ID
 * @param _dailyGoal 每日目标（用于严格模式判定，当前未使用）
 * @returns 连续打卡天数（包括今天）
 */
async function calculateConsecutiveDays(userId: number, _dailyGoal: number): Promise<number> {
  try {
    // 获取昨天的日期（北京时间）
    const yesterday = getBeijingYesterday();

    // 查找昨天的打卡记录
    const yesterdayCheckIn = await prisma.dailyCheckIn.findUnique({
      where: {
        userId_checkInDate: {
          userId: userId,
          checkInDate: yesterday
        }
      }
    });

    if (yesterdayCheckIn && yesterdayCheckIn.goalCompleted) {
      // 昨天有打卡且完成目标，连续天数 = 昨天的连续天数 + 1
      return yesterdayCheckIn.consecutiveDays + 1;
    } else {
      // 昨天没打卡或未完成目标，重新开始计数
      return 1;
    }
  } catch (error) {
    console.error('计算连续打卡天数失败:', error);
    return 1;
  }
}
