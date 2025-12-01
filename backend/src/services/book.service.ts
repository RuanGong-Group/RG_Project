import prisma from '../utils/prisma';
import { getOrCreateSalt, applyStableShuffle, reshuffleSalt } from '../utils/shuffle';

export class BookService {
  /**
   * 获取所有词书列表
   */
  async getAllBooks() {
    // 查询所有词书，并统计每个词书的单词数量
    const books = await prisma.bookTag.findMany({
      include: {
        _count: {
          select: {
            words: true // 统计关联的单词数量
          }
        }
      },
      orderBy: {
        id: 'asc'
      }
    });

    // 格式化返回数据
    return books.map(book => ({
      id: book.id,
      tagName: book.tagName,
      isUserDefined: book.isUserDefined,
      wordCount: book._count.words,
      createdAt: book.createdAt
    }));
  }

  /**
   * 获取用户当前学习词书
   */
  async getCurrentBook(userId: number) {
    // 查询用户信息，包括当前选择的词书
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        currentBookTag: {
          include: {
            _count: {
              select: {
                words: true
              }
            }
          }
        }
      }
    });

    if (!user) {
      throw new Error('用户不存在');
    }

    // 如果用户还没有选择词书
    if (!user.currentBookTag) {
      return null;
    }

    // 返回当前词书信息
    return {
      id: user.currentBookTag.id,
      tagName: user.currentBookTag.tagName,
      isUserDefined: user.currentBookTag.isUserDefined,
      wordCount: user.currentBookTag._count.words,
      createdAt: user.currentBookTag.createdAt
    };
  }

  /**
   * 切换当前学习词书
   */
  async updateCurrentBook(userId: number, bookTagId: number) {
    // 检查词书是否存在
    const book = await prisma.bookTag.findUnique({
      where: { id: bookTagId },
      include: {
        _count: {
          select: {
            words: true
          }
        }
      }
    });

    if (!book) {
      throw new Error('指定的词书不存在');
    }

    // 更新用户的当前词书
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        currentBookTagId: bookTagId
      },
      include: {
        currentBookTag: {
          include: {
            _count: {
              select: {
                words: true
              }
            }
          }
        }
      }
    });

    // 返回更新后的词书信息
    return {
      id: updatedUser.currentBookTag!.id,
      tagName: updatedUser.currentBookTag!.tagName,
      isUserDefined: updatedUser.currentBookTag!.isUserDefined,
      wordCount: updatedUser.currentBookTag!._count.words,
      createdAt: updatedUser.currentBookTag!.createdAt
    };
  }

  /**
   * 获取词书的单词列表（带稳定乱序）
   */
  async getBookWords(userId: number, bookId: number, limit: number = 50, offset: number = 0, includeProgress: boolean = false) {
    // 检查词书是否存在
    const book = await prisma.bookTag.findUnique({
      where: { id: bookId }
    });

    if (!book) {
      throw new Error('词书不存在');
    }

    // 获取词书中的所有单词ID
    const wordRelations = await prisma.wordTagRelation.findMany({
      where: { bookTagId: bookId },
      select: { wordId: true }
    });

    const wordIds = wordRelations.map(r => r.wordId);

    if (wordIds.length === 0) {
      return {
        bookId: book.id,
        bookName: book.tagName,
        salt: '',
        words: [],
        total: 0,
        limit,
        offset
      };
    }

    // 获取稳定乱序的 salt 并应用乱序
    const salt = await getOrCreateSalt(userId, bookId);
    const shuffledWordIds = applyStableShuffle(wordIds, userId, salt);

    // 分页获取
    const paginatedWordIds = shuffledWordIds.slice(offset, offset + limit);

    // 查询单词详细信息
    const words = await prisma.word.findMany({
      where: { id: { in: paginatedWordIds } },
      select: {
        id: true,
        word: true,
        lemma: true,
        pronunciation: true,
        meanings: {
          select: {
            id: true,
            partOfSpeech: true,
            definition: true
          }
        }
      }
    });

    // 如果需要包含学习进度
    let wordsWithProgress = words;
    if (includeProgress) {
      const meaningIds = words.flatMap(w => w.meanings.map(m => m.id));
      const progressList = await prisma.userLearningProgress.findMany({
        where: {
          userId,
          meaningId: { in: meaningIds }
        },
        select: {
          meaningId: true,
          masteryLevel: true,
          nextReviewAt: true
        }
      });

      const progressMap = new Map(progressList.map(p => [p.meaningId, p]));

      wordsWithProgress = words.map(word => ({
        ...word,
        meanings: word.meanings.map(m => ({
          ...m,
          progress: progressMap.get(m.id) || null
        }))
      }));
    }

    // 按照乱序后的顺序排列结果
    const wordMap = new Map(wordsWithProgress.map(w => [w.id, w]));
    const orderedWords = paginatedWordIds.map(id => wordMap.get(id)!).filter(Boolean);

    return {
      bookId: book.id,
      bookName: book.tagName,
      salt,
      words: orderedWords,
      total: shuffledWordIds.length,
      limit,
      offset
    };
  }

  /**
   * 重新乱序词书
   */
  async reshuffleBook(userId: number, bookId: number) {
    // 检查词书是否存在
    const book = await prisma.bookTag.findUnique({
      where: { id: bookId }
    });

    if (!book) {
      throw new Error('词书不存在');
    }

    // 更新 salt（重新乱序）
    const newSalt = await reshuffleSalt(userId, bookId);

    return {
      bookId,
      bookName: book.tagName,
      salt: newSalt
    };
  }
}

export const bookService = new BookService();
