import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import {
  addWordToNotebook,
  removeWordFromNotebook,
  getNotebookWords
} from '../controllers/notebook.controller';

const router = Router();

// 所有生词本相关路由都需要认证
router.use(authenticateToken);

// 获取生词本列表
router.get('/words', getNotebookWords);

// 添加单词到生词本
router.post('/words', addWordToNotebook);

// 从生词本删除单词
router.delete('/words/:wordId', removeWordFromNotebook);

export default router;
