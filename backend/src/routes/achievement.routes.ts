/**
 * 成就系统路由
 */

import { Router } from 'express';
import { getAchievements } from '../controllers/achievement.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

// 获取用户成就列表
router.get('/', authenticateToken, getAchievements);

export default router;
