
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 正在扫描未成功重构的单词...');

  const words = await prisma.word.findMany({
    include: {
      meanings: true
    }
  });

  const missingWords = words.filter(word => {
    // 判定标准：
    // 1. 没有释义 (可能是删除了但没写入新释义？理论上事务会回滚，所以应该是旧释义)
    // 2. 有释义，但释义中没有 distractors 字段 (说明是旧数据)
    if (word.meanings.length === 0) return true;
    
    // 只要有一个释义没有 distractors，就视为未完成
    const isRefactored = word.meanings.every((m: any) => 
      m.extra && typeof m.extra === 'object' && 'distractors' in m.extra
    );
    
    return !isRefactored;
  });

  console.log(`\n📊 统计结果:`);
  console.log(`- 总单词数: ${words.length}`);
  console.log(`- 已完成重构: ${words.length - missingWords.length}`);
  console.log(`- ❌ 未完成/失败: ${missingWords.length}`);

  if (missingWords.length > 0) {
    console.log(`\n📋 未完成单词示例 (前 20 个):`);
    missingWords.slice(0, 20).forEach(w => {
      console.log(`  [ID: ${w.id}] ${w.word}`);
    });

    console.log(`\n💡 建议: 直接重新运行 smart-refactor.ts 脚本，它会自动跳过已完成的单词，只处理这些漏网之鱼。`);
  } else {
    console.log(`\n🎉 完美！所有单词都已包含混淆选项。`);
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
