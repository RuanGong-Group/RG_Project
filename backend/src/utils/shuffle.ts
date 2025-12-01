import crypto from 'crypto';
import prisma from './prisma';

/**
 * 稳定哈希函数 - 用于生成稳定的排序键
 * 基于 MD5 hash，确保相同输入始终产生相同输出
 * 
 * @param userId - 用户ID
 * @param wordId - 单词ID
 * @param salt - 盐值（从 user_book_settings 获取）
 * @returns 哈希值的数值表示（用于排序）
 */
export function stableHash(userId: number, wordId: number, salt: string): number {
  const input = `${userId}-${wordId}-${salt}`;
  const hash = crypto.createHash('md5').update(input).digest('hex');
  // 取前8位转为数字（足够分散）
  return parseInt(hash.substring(0, 8), 16);
}

/**
 * 生成随机盐值
 * @returns 64位随机字符串
 */
export function generateSalt(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * 获取或创建用户在特定词书的稳定乱序盐值
 * 
 * @param userId - 用户ID
 * @param bookTagId - 词书ID
 * @returns 盐值字符串
 */
export async function getOrCreateSalt(userId: number, bookTagId: number): Promise<string> {
  // 参数验证
  if (!userId || !bookTagId) {
    throw new Error(`Invalid parameters: userId=${userId}, bookTagId=${bookTagId}`);
  }

  console.log('🔍 getOrCreateSalt called with:', { userId, bookTagId });

  // 尝试查找现有配置
  let settings = await prisma.userBookSettings.findUnique({
    where: {
      userId_bookTagId: { userId, bookTagId }
    }
  });

  // 如果不存在，创建新配置
  if (!settings) {
    console.log('📝 Creating new UserBookSettings...');
    
    // 验证词书是否存在
    const book = await prisma.bookTag.findUnique({ where: { id: bookTagId } });
    
    if (!book) {
      throw new Error(`Book not found: bookTagId=${bookTagId}`);
    }
    
    // 检查用户是否存在，如果不存在则使用默认用户
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      console.warn(`⚠️ User ${userId} not found, using default testuser (id=1)`);
      // 使用默认用户ID
      userId = 1;
      
      // 再次检查是否已有配置
      settings = await prisma.userBookSettings.findUnique({
        where: {
          userId_bookTagId: { userId, bookTagId }
        }
      });
      
      if (settings) {
        return settings.salt;
      }
    }

    const newSalt = generateSalt();
    settings = await prisma.userBookSettings.create({
      data: {
        userId,
        bookTagId,
        salt: newSalt,
        shuffleAlgorithm: 'stable_hash'
      }
    });
    
    console.log('✅ Created UserBookSettings:', settings.id);
  }

  return settings.salt;
}

/**
 * 更新盐值（重新乱序）
 * 
 * @param userId - 用户ID
 * @param bookTagId - 词书ID
 * @returns 新的盐值
 */
export async function reshuffleSalt(userId: number, bookTagId: number): Promise<string> {
  const newSalt = generateSalt();
  
  await prisma.userBookSettings.upsert({
    where: {
      userId_bookTagId: { userId, bookTagId }
    },
    update: {
      salt: newSalt,
      updatedAt: new Date()
    },
    create: {
      userId,
      bookTagId,
      salt: newSalt,
      shuffleAlgorithm: 'stable_hash'
    }
  });

  return newSalt;
}

/**
 * 对单词ID数组应用稳定乱序
 * 
 * @param wordIds - 单词ID数组
 * @param userId - 用户ID
 * @param salt - 盐值
 * @returns 乱序后的单词ID数组
 */
export function applyStableShuffle(
  wordIds: number[],
  userId: number,
  salt: string
): number[] {
  // 为每个单词计算稳定哈希值
  const wordWithHash = wordIds.map(wordId => ({
    wordId,
    sortKey: stableHash(userId, wordId, salt)
  }));

  // 按哈希值排序
  wordWithHash.sort((a, b) => a.sortKey - b.sortKey);

  // 返回排序后的单词ID
  return wordWithHash.map(item => item.wordId);
}
