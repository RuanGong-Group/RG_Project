import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const userId = 1; // Default user
  console.log(`🔧 Preparing review data for user ${userId}...`);

  // 1. Get some meanings to set as "learned"
  // We skip the first 5 to avoid messing up any immediate testing the user might be doing
  const meanings = await prisma.meaning.findMany({
    take: 15,
    skip: 5,
    select: { id: true }
  });

  if (meanings.length === 0) {
    console.log('❌ No meanings found in database. Please import data first.');
    return;
  }

  console.log(`Found ${meanings.length} meanings to mock.`);

  // 2. Create or update progress for these meanings
  let count = 0;
  for (const m of meanings) {
    // Set nextReviewAt to 1 day ago (so it's due)
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 1);

    await prisma.userLearningProgress.upsert({
      where: {
        userId_meaningId: {
          userId,
          meaningId: m.id
        }
      },
      update: {
        nextReviewAt: pastDate,
        masteryLevel: 1, // Level 1 = Learned but needs review
        interval: 1,
        repetitions: 1,
        lastReviewAt: new Date() // Just reviewed "now" (but actually we are faking the schedule)
      },
      create: {
        userId,
        meaningId: m.id,
        nextReviewAt: pastDate,
        masteryLevel: 1,
        interval: 1,
        repetitions: 1,
        easinessFactor: 2.5,
        lastReviewAt: new Date()
      }
    });
    count++;
  }

  console.log(`✅ Successfully set ${count} words as "Due for Review".`);
  console.log('Please refresh the "Today Plan" page to see the review tasks.');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
