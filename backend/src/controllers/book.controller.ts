/**
 * 词书管理控制器
 * 处理词书相关的业务逻辑
 */

import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { bookService } from '../services/book.service';

/**
 * 获取所有词书列表
 * GET /api/books
 */
export const getAllBooks = async (_req: AuthRequest, res: Response) => {
  try {
    const formattedBooks = await bookService.getAllBooks();

    res.json({
      success: true,
      data: formattedBooks,
      message: '成功获取词书列表'
    });
  } catch (error) {
    console.error('获取词书列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取词书列表失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
};

/**
 * 获取当前学习词书
 * GET /api/user/current-book
 */
export const getCurrentBook = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: '用户未认证'
      });
    }

    const currentBook = await bookService.getCurrentBook(userId);

    if (!currentBook) {
      return res.json({
        success: true,
        data: null,
        message: '用户尚未选择学习词书'
      });
    }

    return res.json({
      success: true,
      data: currentBook,
      message: '成功获取当前学习词书'
    });
  } catch (error) {
    console.error('获取当前词书失败:', error);
    
    if (error instanceof Error && error.message === '用户不存在') {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    return res.status(500).json({
      success: false,
      message: '获取当前词书失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
};

/**
 * 切换当前学习词书
 * PUT /api/user/current-book
 * Body: { bookTagId: number }
 */
export const updateCurrentBook = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { bookTagId } = req.body as { bookTagId: number };

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: '用户未认证'
      });
    }

    // 验证请求参数
    if (!bookTagId || typeof bookTagId !== 'number') {
      return res.status(400).json({
        success: false,
        message: '请提供有效的词书ID'
      });
    }

    const currentBook = await bookService.updateCurrentBook(userId, bookTagId);

    return res.json({
      success: true,
      data: currentBook,
      message: `成功切换到词书：${currentBook.tagName}`
    });
  } catch (error) {
    console.error('切换词书失败:', error);

    if (error instanceof Error && error.message === '指定的词书不存在') {
      return res.status(404).json({
        success: false,
        message: '指定的词书不存在'
      });
    }

    return res.status(500).json({
      success: false,
      message: '切换词书失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
};

/**
 * 获取词书的单词列表（带稳定乱序）
 * GET /api/books/:bookId/words
 * Query: limit (可选，默认50), offset (可选，默认0), includeProgress (可选，是否包含学习进度)
 */
export const getBookWords = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const bookId = parseInt(req.params.bookId);
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200); // 最大200
    const offset = parseInt(req.query.offset as string) || 0;
    const includeProgress = req.query.includeProgress === 'true';

    console.log('🔍 getBookWords - userId:', userId, 'bookId:', bookId);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: '用户未认证'
      });
    }

    if (isNaN(bookId)) {
      return res.status(400).json({
        success: false,
        message: '无效的词书ID'
      });
    }

    const result = await bookService.getBookWords(userId, bookId, limit, offset, includeProgress);

    return res.json({
      success: true,
      data: result,
      message: '成功获取词书单词列表'
    });
  } catch (error) {
    console.error('获取词书单词列表失败:', error);

    if (error instanceof Error && error.message === '词书不存在') {
      return res.status(404).json({
        success: false,
        message: '词书不存在'
      });
    }

    return res.status(500).json({
      success: false,
      message: '获取词书单词列表失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
};

/**
 * 重新乱序词书
 * POST /api/books/:bookId/reshuffle
 */
export const reshuffleBook = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const bookId = parseInt(req.params.bookId);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: '用户未认证'
      });
    }

    if (isNaN(bookId)) {
      return res.status(400).json({
        success: false,
        message: '无效的词书ID'
      });
    }

    const result = await bookService.reshuffleBook(userId, bookId);

    return res.json({
      success: true,
      data: {
        bookId: result.bookId,
        salt: result.salt.substring(0, 8) + '...' // 只返回部分salt用于确认
      },
      message: `成功重新乱序词书：${result.bookName}`
    });
  } catch (error) {
    console.error('重新乱序失败:', error);

    if (error instanceof Error && error.message === '词书不存在') {
      return res.status(404).json({
        success: false,
        message: '词书不存在'
      });
    }

    return res.status(500).json({
      success: false,
      message: '重新乱序失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
};

