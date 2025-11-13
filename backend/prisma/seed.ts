import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 开始填充种子数据 (V2)...\n');

  // ============================================
  // 0. 清空现有数据（按依赖顺序删除）
  // ============================================
  console.log('🗑️  清空现有数据...');
  // Relations first
  await prisma.meaningExampleRelation.deleteMany();
  await prisma.wordTagRelation.deleteMany();
  await prisma.userLearningProgress.deleteMany();
  await prisma.userWordNotebook.deleteMany();
  await prisma.dailyCheckIn.deleteMany();
  await prisma.userAchievement.deleteMany();
  
  // Core models
  await prisma.meaning.deleteMany();
  await prisma.word.deleteMany();
  await prisma.examplePool.deleteMany();
  await prisma.user.deleteMany();
  await prisma.bookTag.deleteMany();
  console.log('✅ 数据清空完成\n');

  // ============================================
  // 1. 创建词书标签
  // ============================================
  console.log('📚 创建词书标签...');
  const bookTag = await prisma.bookTag.create({
    data: {
      tagName: '四级核心词汇',
    },
  });
  console.log(`✅ 词书标签创建成功: ${bookTag.tagName}\n`);

  // ============================================
  // 2. 创建例句池
  // ============================================
  console.log('📝 创建例句池...');
  const examples = await Promise.all([
    prisma.examplePool.create({ data: { sentence: 'I need to have a word with you about the project.', sourceType: 'true_exam', sourceDetail: 'CET-4 2022.12' } }),
    prisma.examplePool.create({ data: { sentence: 'Actions speak louder than words.', sourceType: 'true_exam', sourceDetail: 'CET-4 2021.06' } }),
    prisma.examplePool.create({ data: { sentence: 'She is studying for her final exams.', sourceType: 'true_exam', sourceDetail: 'CET-4 2023.06' } }),
    prisma.examplePool.create({ data: { sentence: 'The study shows that exercise improves memory.', sourceType: 'ai_generated' } }),
    prisma.examplePool.create({ data: { sentence: 'Children learn languages more easily than adults.', sourceType: 'true_exam', sourceDetail: 'CET-4 2020.12' } }),
    prisma.examplePool.create({ data: { sentence: 'We can learn a lot from our mistakes.', sourceType: 'ai_generated' } }),
    prisma.examplePool.create({ data: { sentence: 'Where did you go for your holiday?', sourceType: 'true_exam', sourceDetail: 'CET-4 2019.12' } }),
    prisma.examplePool.create({ data: { sentence: 'She went to the store to buy some milk.', sourceType: 'ai_generated' } }),
  ]);
  console.log(`✅ 创建了 ${examples.length} 个例句\n`);

  // ============================================
  // 3. 创建单词 (V2 结构)
  // ============================================
  console.log('📖 创建单词...');

  // --- 单词 1: word ---
  const word1 = await prisma.word.create({
    data: {
      word: 'word',
      pronunciation: { uk: '/wɜːd/', us: '/wɝːd/' },
      meanings: {
        create: [
          {
            partOfSpeech: 'n.',
            definition: '单词，词',
            extra: { synonyms: ['term', 'expression'] },
          },
          {
            partOfSpeech: 'n.',
            definition: '话语，言语',
            extra: { phrase: 'have a word with sb.', meaning: '与某人谈话' },
          },
          {
            partOfSpeech: 'v.',
            definition: '措辞，用词表达',
          },
        ],
      },
    },
    include: { meanings: true },
  });
  await prisma.meaningExampleRelation.createMany({
    data: [
      { meaningId: word1.meanings[1].id, exampleId: examples[0].id, isPrimary: true },
      { meaningId: word1.meanings[0].id, exampleId: examples[1].id, isPrimary: true },
    ],
  });
  await prisma.wordTagRelation.create({ data: { wordId: word1.id, bookTagId: bookTag.id, masteryFocus: 'recognition' } });

  // --- 单词 2: study ---
  const word2 = await prisma.word.create({
    data: {
      word: 'study',
      pronunciation: { uk: '/ˈstʌdi/', us: '/ˈstʌdi/' },
      meanings: {
        create: [
          { partOfSpeech: 'v.', definition: '学习，研究' },
          { partOfSpeech: 'n.', definition: '学习，研究' },
          { partOfSpeech: 'n.', definition: '书房' },
        ],
      },
    },
    include: { meanings: true },
  });
  await prisma.meaningExampleRelation.createMany({
    data: [
      { meaningId: word2.meanings[0].id, exampleId: examples[2].id, isPrimary: true },
      { meaningId: word2.meanings[1].id, exampleId: examples[3].id, isPrimary: true },
    ],
  });
  await prisma.wordTagRelation.create({ data: { wordId: word2.id, bookTagId: bookTag.id, masteryFocus: 'production' } });

  // --- 单词 3: learn ---
  const word3 = await prisma.word.create({
    data: {
      word: 'learn',
      pronunciation: { uk: '/lɜːn/', us: '/lɝːn/' },
      meanings: {
        create: [
          {
            partOfSpeech: 'v.',
            definition: '学习，学会',
            extra: { usage: 'learn + to do / learn + that从句', synonyms: ['acquire', 'master'] },
          },
          { partOfSpeech: 'v.', definition: '得知，获悉' },
        ],
      },
    },
    include: { meanings: true },
  });
  await prisma.meaningExampleRelation.createMany({
    data: [
      { meaningId: word3.meanings[0].id, exampleId: examples[4].id, isPrimary: true },
      { meaningId: word3.meanings[1].id, exampleId: examples[5].id, isPrimary: true },
    ],
  });
  await prisma.wordTagRelation.create({ data: { wordId: word3.id, bookTagId: bookTag.id, masteryFocus: 'recognition' } });

  // --- 单词 4 & 5: go & went (演示 Lemma 功能) ---
  const word_go = await prisma.word.create({
    data: {
      word: 'go',
      pronunciation: { uk: '/ɡəʊ/', us: '/ɡoʊ/' },
      meanings: {
        create: [{ partOfSpeech: 'v.', definition: '去，往' }],
      },
    },
    include: { meanings: true },
  });
  await prisma.meaningExampleRelation.create({ data: { meaningId: word_go.meanings[0].id, exampleId: examples[6].id, isPrimary: true } });
  await prisma.wordTagRelation.create({ data: { wordId: word_go.id, bookTagId: bookTag.id, masteryFocus: 'recognition' } });

  const word_went = await prisma.word.create({
    data: {
      word: 'went',
      pronunciation: { uk: '/went/', us: '/went/' },
      // 核心：关联到原型 'go'
      lemma: 'go',
      prototype: {
        connect: { id: word_go.id },
      },
      meanings: {
        create: [{ partOfSpeech: 'v.', definition: 'go的过去式' }],
      },
    },
    include: { meanings: true },
  });
  await prisma.meaningExampleRelation.create({ data: { meaningId: word_went.meanings[0].id, exampleId: examples[7].id, isPrimary: true } });
  // 'went' 作为派生词，可以不直接关联到词书，学习时通过 'go' 找到
  
  console.log('✅ 单词创建完成\n');

  // ============================================
  // 4. 创建用户
  // ============================================
  console.log('👤 创建用户...');
  const hashedPassword = await bcrypt.hash('password123', 10);
  const user = await prisma.user.create({
    data: {
      username: 'testuser',
      passwordHash: hashedPassword,
      currentBookTagId: bookTag.id,
      dailyLearningGoal: 20,
    },
  });
  console.log(`✅ 用户创建成功: ${user.username}\n`);

  // ============================================
  // 5. 创建用户学习进度
  // ============================================
  console.log('📈 创建用户学习进度...');
  await prisma.userLearningProgress.create({
    data: {
      userId: user.id,
      meaningId: word1.meanings[0].id,
      masteryLevel: 1,
      nextReviewAt: new Date(),
    },
  });
  console.log('✅ 用户学习进度创建成功\n');

  console.log('🎉 种子数据填充完成！');
}

main()
  .catch((e) => {
    console.error('❌ 填充种子数据时发生错误:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
