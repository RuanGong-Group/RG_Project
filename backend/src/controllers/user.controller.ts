/**
 * 用户设置控制器
 * 处理用户相关设置功能
 */

import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { userService } from '../services/user.service';

/**
 * 获取用户的每日学习目标
 * GET /api/user/settings/daily-goal
 * 
 * 返回数据：
 * - dailyGoal: 用户设置的每日学习目标（单词数）
 */
export const getDailyGoal = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: '用户未认证'
      });
      return;
    }

    const data = await userService.getDailyGoal(userId);

    res.json({
      success: true,
      message: '获取每日目标成功',
      data
    });

  } catch (error) {
    console.error('获取每日目标失败:', error);
    
    if (error instanceof Error && error.message === '用户不存在') {
      res.status(404).json({
        success: false,
        message: '用户不存在'
      });
      return;
    }

    res.status(500).json({
      success: false,
      message: '获取每日目标失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
};

/**
 * 更新用户的每日学习目标
 * PUT /api/user/settings/daily-goal
 * 
 * 请求体：
 * - dailyGoal: number (1-100)
 * 
 * 返回数据：
 * - dailyGoal: 更新后的每日学习目标
 */
export const updateDailyGoal = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const { dailyGoal } = req.body;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: '用户未认证'
      });
      return;
    }

    // 验证输入
    if (dailyGoal === undefined || dailyGoal === null) {
      res.status(400).json({
        success: false,
        message: '请提供每日目标（dailyGoal）'
      });
      return;
    }

    // 验证数据类型
    if (typeof dailyGoal !== 'number' || !Number.isInteger(dailyGoal)) {
      res.status(400).json({
        success: false,
        message: '每日目标必须是整数'
      });
      return;
    }

    const data = await userService.updateDailyGoal(userId, dailyGoal);

    res.json({
      success: true,
      message: '更新每日目标成功',
      data
    });

  } catch (error) {
    console.error('更新每日目标失败:', error);

    if (error instanceof Error && error.message === '每日目标必须在1-300之间') {
      res.status(400).json({
        success: false,
        message: '每日目标必须在1-300之间'
      });
      return;
    }

    res.status(500).json({
      success: false,
      message: '更新每日目标失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
};
