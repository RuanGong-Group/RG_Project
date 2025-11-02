import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import { 
  getNextLearningContent, 
  updateLearningProgress,
  getTodayReviewContent,
  submitReviewResult,
  getNextWordToLearn,
  submitMeaningResult,
  completeWordLearning,
  getTodayLearningPlan
} from '../controllers/learning.controller';

const router = Router();

// 所有学习相关的路由都需要认证
router.use(authenticateToken);

/**
 * @route   GET /api/learning/next
 * @desc    获取下一个学习内容
 * @access  Private
 */
router.get('/next', getNextLearningContent);

/**
 * @route   POST /api/learning/progress
 * @desc    更新学习进度
 * @access  Private
 */
router.post('/progress', updateLearningProgress);

/**
 * @route   GET /api/learning/review/today
 * @desc    获取今日待复习内容
 * @access  Private
 */
router.get('/review/today', getTodayReviewContent);

/**
 * @route   POST /api/learning/review/submit
 * @desc    提交复习结果
 * @access  Private
 */
router.post('/review/submit', submitReviewResult);

// ===== 新的学习流程API（完整单词学习）=====

/**
 * @route   GET /api/learning/word/next
 * @desc    获取下一个需要学习的单词（包含所有未学习的词义）
 * @access  Private
 */
router.get('/word/next', getNextWordToLearn);

/**
 * @route   POST /api/learning/meaning/submit
 * @desc    提交单个词义的学习结果
 * @access  Private
 */
router.post('/meaning/submit', submitMeaningResult);

/**
 * @route   POST /api/learning/word/complete
 * @desc    标记单词学习完成（所有词义都已学习）
 * @access  Private
 */
router.post('/word/complete', completeWordLearning);

/**
 * @route   GET /api/learning/today-plan
 * @desc    获取今日学习计划（智能分配复习和新学习）
 * @access  Private
 */
router.get('/today-plan', getTodayLearningPlan);

export default router;
