import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function countAll() {
  try {
    const wordCount = await prisma.word.count();
    const posCount = await prisma.partOfSpeech.count();
    const meaningCount = await prisma.meaning.count();
    const bookCount = await prisma.bookTag.count();
    
    console.log('\n📊 数据库统计：\n');
    console.log('='.repeat(50));
    console.log(`📝 单词总数: ${wordCount}`);
    console.log(`📌 词性总数: ${posCount}`);
    console.log(`💡 词义总数: ${meaningCount}`);
    console.log(`📚 词书总数: ${bookCount}`);
    console.log('='.repeat(50) + '\n');
    
  } catch (error) {
    console.error('❌ 查询失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

countAll();
