
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // 只测试 abandon 这个词，看看干扰项是否改善
  const words = await prisma.word.findMany({
    where: {
      word: 'abandon'
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

  for (const word of words) {
    console.log(`\n========================================`);
    console.log(`Word: ${word.word}`);
    
    for (const meaning of word.meanings) {
      console.log(`\n  Meaning (${meaning.partOfSpeech}): ${meaning.definition}`);
      console.log(`  Distractors:`, JSON.stringify(meaning.extra, null, 2));
    }
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
