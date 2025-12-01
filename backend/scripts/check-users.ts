/**
 * 检查当前登录用户信息
 */
import prisma from '../src/utils/prisma';

async function main() {
  console.log('🔍 检查所有用户:\n');

  const users = await prisma.user.findMany({
    select: {
      id: true,
      username: true,
      createdAt: true,
      currentBookTagId: true
    }
  });

  if (users.length === 0) {
    console.log('❌ 数据库中没有用户');
    return;
  }

  console.log(`找到 ${users.length} 个用户:\n`);
  users.forEach(user => {
    console.log(`  ID: ${user.id}`);
    console.log(`  用户名: ${user.username}`);
    console.log(`  当前词书ID: ${user.currentBookTagId || '未选择'}`);
    console.log(`  创建时间: ${user.createdAt}`);
    console.log('  ---');
  });

  // 检查词书
  console.log('\n🔍 检查所有词书:\n');
  const books = await prisma.bookTag.findMany({
    select: {
      id: true,
      tagName: true,
      _count: {
        select: {
          words: true
        }
      }
    }
  });

  books.forEach(book => {
    console.log(`  ID: ${book.id}`);
    console.log(`  名称: ${book.tagName}`);
    console.log(`  单词数: ${book._count.words}`);
    console.log('  ---');
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
