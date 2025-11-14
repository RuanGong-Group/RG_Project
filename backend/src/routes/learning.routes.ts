import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import { 
  updateLearningProgress,
  getTodayReviewContent,
  submitReviewResult,
  getNextWordToLearn,
  getTodayPlan,
} from '../controllers/learning.controller';

const router = Router();

// 所有学习相关的路由都需要认证
router.use(authenticateToken);

/**
 * @route   GET /api/learning/today-plan
 * @desc    获取今日学习计划 (V2)
 * @access  Private
 */
router.get('/today-plan', getTodayPlan);

/**
 * @route   POST /api/learning/progress
 * @desc    更新学习进度 (V2)
 * @access  Private
 */
router.post('/progress', updateLearningProgress);


/**
 * @route   GET /api/learning/review/today
 * @desc    获取今日待复习内容 (V2)
 * @access  Private
 */
router.get('/review/today', getTodayReviewContent);

/**
 * @route   POST /api/learning/review/submit
 * @desc    提交复习结果 (V2)
 * @access  Private
 */
router.post('/review/submit', submitReviewResult);

/**
 * @route   GET /api/learning/word/next
 * @desc    获取下一个需要学习的单词 (V2)
 * @access  Private
 */
router.get('/word/next', getNextWordToLearn);


export default router;
