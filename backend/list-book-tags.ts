import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function listBookTags() {
  try {
    const tags = await prisma.bookTag.findMany({
      orderBy: { id: 'asc' }
    });
    
    console.log('\n📚 数据库中的词书标签列表：\n');
    console.log('='.repeat(60));
    
    if (tags.length === 0) {
      console.log('  (暂无词书标签)');
    } else {
      tags.forEach(tag => {
        console.log(`  ID: ${tag.id}`);
        console.log(`  名称: ${tag.tagName}`);
        console.log(`  用户定义: ${tag.isUserDefined ? '是' : '否'}`);
        console.log(`  创建时间: ${tag.createdAt}`);
        console.log('-'.repeat(60));
      });
    }
    
    console.log(`\n总计: ${tags.length} 个词书标签\n`);
  } catch (error) {
    console.error('❌ 查询失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

listBookTags();
