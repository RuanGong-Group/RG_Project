import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { notebookService } from '../services/notebook.service';

/**
 * 添加单词到生词本
 * POST /api/notebook/words
 */
export async function addWordToNotebook(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: '用户未认证'
      });
      return;
    }
    const { wordId } = req.body;

    // 参数验证
    if (!wordId) {
      return res.status(400).json({
        success: false,
        message: '缺少必要参数 wordId'
      });
    }

    const notebookEntry = await notebookService.addWordToNotebook(userId, wordId);

    return res.json({
      success: true,
      message: '成功添加到生词本',
      data: notebookEntry
    });
  } catch (error) {
    console.error('添加生词本失败:', error);
    
    if (error instanceof Error) {
      if (error.message === '单词不存在') {
        return res.status(404).json({
          success: false,
          message: '单词不存在'
        });
      }
      if (error.message === '单词已在生词本中') {
        return res.status(400).json({
          success: false,
          message: '单词已在生词本中'
        });
      }
    }

    return res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
}

/**
 * 从生词本删除单词
 * DELETE /api/notebook/words/:wordId
 */
export async function removeWordFromNotebook(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: '用户未认证'
      });
      return;
    }

    const wordId = parseInt(req.params.wordId as string);

    // 参数验证
    if (isNaN(wordId)) {
      return res.status(400).json({
        success: false,
        message: '无效的 wordId'
      });
    }

    await notebookService.removeWordFromNotebook(userId, wordId);

    return res.json({
      success: true,
      message: '成功从生词本删除'
    });
  } catch (error) {
    console.error('删除生词本失败:', error);

    if (error instanceof Error && error.message === '单词不在生词本中') {
      return res.status(404).json({
        success: false,
        message: '单词不在生词本中'
      });
    }

    return res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
}

/**
 * 获取生词本列表
 * GET /api/notebook/words
 */
export async function getNotebookWords(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: '用户未认证'
      });
      return;
    }

    const data = await notebookService.getNotebookWords(userId);

    return res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('获取生词本失败:', error);
    return res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
}
