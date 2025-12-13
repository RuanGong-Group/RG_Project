/**
 * 打卡系统路由
 * 处理用户打卡相关的请求
 */

import express from 'express';
import { getTodayCheckIn, getCheckInHistory, getCheckInCalendar } from '../controllers/checkin.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = express.Router();

/**
 * 获取今日打卡状态
 * GET /api/checkin/today
 * 需要认证
 */
router.get('/today', authenticateToken, getTodayCheckIn);

/**
 * 获取打卡历史
 * GET /api/checkin/history
 * 需要认证
 * 查询参数: ?days=30 (可选，默认30天)
 */
router.get('/history', authenticateToken, getCheckInHistory);

/**
 * 获取打卡日历
 * GET /api/checkin/calendar/:year/:month
 * 需要认证
 * 示例: /api/checkin/calendar/2024/12
 */
router.get('/calendar/:year/:month', authenticateToken, getCheckInCalendar);

export default router;
