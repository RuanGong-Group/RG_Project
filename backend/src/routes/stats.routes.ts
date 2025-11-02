import { Router } from 'express';
import { getOverview, getProgressCurve } from '../controllers/stats.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

/**
 * @route   GET /api/stats/overview
 * @desc    获取学习概览（今日数据、总体进度）
 * @access  Private（需要登录）
 */
router.get('/overview', authenticateToken, getOverview);

/**
 * @route   GET /api/stats/progress
 * @desc    获取学习进度曲线（最近30天）
 * @access  Private（需要登录）
 */
router.get('/progress', authenticateToken, getProgressCurve);

export default router;
