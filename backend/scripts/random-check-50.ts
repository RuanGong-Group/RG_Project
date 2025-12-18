
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🎲 正在随机抽取 50 个单词进行检查...');

  // 1. 获取所有单词 ID
  const allIds = await prisma.word.findMany({
    select: { id: true }
  });

  if (allIds.length === 0) {
    console.log('❌ 数据库中没有单词');
    return;
  }

  // 2. 随机选择 50 个 ID
  const shuffled = allIds.sort(() => 0.5 - Math.random());
  const selectedIds = shuffled.slice(0, 50).map(item => item.id);

  // 3. 获取详细信息
  const words = await prisma.word.findMany({
    where: {
      id: { in: selectedIds }
    },
    include: {
      meanings: {
        include: {
          examples: {
            include: {
              example: true
            }
          }
        }
      }
    }
  });

  // 4. 打印结果
  console.log(`\n📊 成功抽取 ${words.length} 个单词:\n`);

  for (const word of words) {
    console.log(`-------------------------------------------------------------------`);
    console.log(`📖 Word: ${word.word} (ID: ${word.id})`);
    console.log(`   Pronunciation: ${JSON.stringify(word.pronunciation)}`);
    
    if (word.meanings.length === 0) {
      console.log(`   ⚠️  No meanings found!`);
    }

    for (const [mIndex, meaning] of word.meanings.entries()) {
      console.log(`\n   [Meaning ${mIndex + 1}] (${meaning.partOfSpeech}) ${meaning.definition}`);
      
      // 检查混淆项
      if (meaning.extra && typeof meaning.extra === 'object' && 'distractors' in meaning.extra) {
        const extra = meaning.extra as any;
        console.log(`     🎯 Distractors (CN): ${extra.distractors.cn.join(', ')}`);
        console.log(`     🎯 Distractors (EN): ${extra.distractors.en.join(', ')}`);
      } else {
        console.log(`     ❌ Missing Distractors!`);
      }

      // 打印例句
      if (meaning.examples.length > 0) {
        console.log(`     📝 Examples:`);
        for (const rel of meaning.examples) {
          const tag = rel.isPrimary ? '✨ [AI]' : '📚 [Legacy]';
          console.log(`       ${tag} ${rel.example.sentence}`);
          console.log(`           (${rel.example.translation || 'No translation'})`);
        }
      } else {
        console.log(`     ⚠️  No examples!`);
      }
    }
    console.log(`\n`);
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
