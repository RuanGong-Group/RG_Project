/**
 * 成就系统控制器
 * 处理成就查询相关的 API 请求
 */

import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { getUserAchievements } from '../services/achievement.service';

/**
 * 获取用户成就列表
 * GET /api/achievements
 * 
 * 返回数据：
 * - 所有成就列表（包含已解锁和未解锁状态）
 * - 按类别分组的成就
 * - 统计信息（总数、已解锁数、进度百分比）
 */
export const getAchievements = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: '用户未认证'
      });
      return;
    }

    const result = await getUserAchievements(userId);

    res.json({
      success: true,
      message: '获取成就列表成功',
      data: result
    });
  } catch (error) {
    console.error('获取成就列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取成就列表失败'
    });
  }
};
