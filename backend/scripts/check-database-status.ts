import prisma from '../src/utils/prisma';

async function checkData() {
  console.log('📊 检查数据库状态...\n');

  // 检查词书
  const bookTags = await prisma.bookTag.findMany({
    select: { id: true, tagName: true }
  });
  console.log(`📚 词书数量: ${bookTags.length}`);
  bookTags.forEach(tag => {
    console.log(`  - ID: ${tag.id}, 名称: ${tag.tagName}`);
  });

  // 检查单词总数
  const totalWords = await prisma.word.count();
  console.log(`\n📝 单词总数: ${totalWords}`);

  // 检查词义总数
  const totalMeanings = await prisma.meaning.count();
  console.log(`💡 词义总数: ${totalMeanings}`);

  // 检查词书-单词关联
  if (bookTags.length > 0) {
    for (const tag of bookTags) {
      const wordsInBook = await prisma.wordTagRelation.count({
        where: { bookTagId: tag.id }
      });
      console.log(`\n📖 词书 "${tag.tagName}" 中的单词数: ${wordsInBook}`);
      
      if (wordsInBook > 0) {
        const sample = await prisma.wordTagRelation.findMany({
          where: { bookTagId: tag.id },
          take: 5,
          include: {
            word: {
              select: { word: true }
            }
          }
        });
        console.log(`   示例单词: ${sample.map(s => s.word.word).join(', ')}`);
      }
    }
  }

  // 检查用户
  const users = await prisma.user.findMany({
    select: { id: true, username: true, currentBookTagId: true }
  });
  console.log(`\n👤 用户数量: ${users.length}`);
  users.forEach(user => {
    console.log(`  - ID: ${user.id}, 用户名: ${user.username}, 当前词书ID: ${user.currentBookTagId}`);
  });

  // 检查学习进度
  const progressCount = await prisma.userLearningProgress.count();
  console.log(`\n📈 学习进度记录数: ${progressCount}`);
}

checkData()
  .catch(e => {
    console.error('❌ 错误:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
