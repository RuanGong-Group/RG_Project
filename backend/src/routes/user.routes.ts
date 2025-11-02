import { Router, Response } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth.middleware';
import { getCurrentBook, updateCurrentBook } from '../controllers/book.controller';
import { getDailyGoal, updateDailyGoal } from '../controllers/user.controller';

const router = Router();

/**
 * @route   GET /api/user/profile
 * @desc    获取当前用户信息（需要认证）
 * @access  Private
 */
router.get('/profile', authenticateToken, (req: AuthRequest, res: Response) => {
  res.json({
    success: true,
    message: '获取用户信息成功',
    data: {
      userId: req.user?.userId,
      username: req.user?.username
    }
  });
});

/**
 * @route   GET /api/user/current-book
 * @desc    获取当前学习词书
 * @access  Private
 */
router.get('/current-book', authenticateToken, getCurrentBook);

/**
 * @route   PUT /api/user/current-book
 * @desc    切换当前学习词书
 * @access  Private
 */
router.put('/current-book', authenticateToken, updateCurrentBook);

/**
 * @route   GET /api/user/settings/daily-goal
 * @desc    获取用户的每日学习目标
 * @access  Private
 */
router.get('/settings/daily-goal', authenticateToken, getDailyGoal);

/**
 * @route   PUT /api/user/settings/daily-goal
 * @desc    更新用户的每日学习目标
 * @access  Private
 */
router.put('/settings/daily-goal', authenticateToken, updateDailyGoal);

export default router;
