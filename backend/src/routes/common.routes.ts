/**
 * 通用路由 - 供 V2 和 V3 共用的端点
 */

import { Router } from 'express';
import { getTodayPlan, getTodayLearnedNewWords } from '../controllers/common.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

/**
 * 获取今日已学习的新单词
 * GET /api/learning/today-new-words
 */
router.get('/learning/today-new-words', authenticateToken, getTodayLearnedNewWords);

/**
 * 获取今日学习计划
 * GET /api/learning/today-plan
 * 
 * 响应示例：
 * {
 *   "success": true,
 *   "data": {
 *     "dailyGoal": 20,
 *     "progress": {
 *       "learned": 5,
 *       "reviewed": 3,
 *       "total": 8
 *     },
 *     "review": {
 *       "dueCount": 10,
 *       "words": [...]
 *     },
 *     "newLearning": {
 *       "quota": 15,
 *       "available": 1000,
 *       "words": [...]
 *     }
 *   }
 * }
 */
router.get('/learning/today-plan', authenticateToken, getTodayPlan);

export default router;
