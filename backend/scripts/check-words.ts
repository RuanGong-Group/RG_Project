
import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const prisma = new PrismaClient();

async function main() {
  const words = await prisma.word.findMany({
    take: 5,
    include: {
      meanings: {
        include: {
          examples: {
            include: {
              example: true,
            },
          },
        },
      },
    },
  });

  console.log(JSON.stringify(words, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
