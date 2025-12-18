
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // 获取最后 5 个单词
  const words = await prisma.word.findMany({
    take: 5,
    orderBy: { id: 'desc' },
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

  for (const word of words) {
    console.log(`\n========================================`);
    console.log(`Word: ${word.word} (ID: ${word.id})`);
    
    for (const meaning of word.meanings) {
      console.log(`\n  Meaning (${meaning.partOfSpeech}): ${meaning.definition}`);
      console.log(`  Distractors:`, JSON.stringify(meaning.extra, null, 2));
    }
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
