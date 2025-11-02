import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 开始填充种子数据...\n');

  // ============================================
  // 0. 清空现有数据（按依赖顺序删除）
  // ============================================
  console.log('�️  清空现有数据...');
  await prisma.userAchievement.deleteMany();
  await prisma.dailyCheckIn.deleteMany();
  await prisma.userWordNotebook.deleteMany();
  await prisma.userLearningProgress.deleteMany();
  await prisma.wordTagRelation.deleteMany();
  await prisma.meaningExampleRelation.deleteMany();
  await prisma.meaning.deleteMany();
  await prisma.partOfSpeech.deleteMany();
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
      tagName: '四级词汇',
      isUserDefined: false
    }
  });
  console.log(`✅ 词书标签创建成功: ${bookTag.tagName}\n`);

  // ============================================
  // 2. 创建例句池
  // ============================================
  console.log('📝 创建例句池...');
  
  const examples = await Promise.all([
    // Word 相关例句
    prisma.examplePool.create({
      data: {
        sentence: 'I need to have a word with you about the project.',
        source: '真题',
        difficulty: '四级'
      }
    }),
    prisma.examplePool.create({
      data: {
        sentence: 'Actions speak louder than words.',
        source: '真题',
        difficulty: '四级'
      }
    }),
    
    // Study 相关例句
    prisma.examplePool.create({
      data: {
        sentence: 'She is studying for her final exams.',
        source: '真题',
        difficulty: '四级'
      }
    }),
    prisma.examplePool.create({
      data: {
        sentence: 'The study shows that exercise improves memory.',
        source: 'AI生成',
        difficulty: '四级'
      }
    }),
    
    // Learn 相关例句
    prisma.examplePool.create({
      data: {
        sentence: 'Children learn languages more easily than adults.',
        source: '真题',
        difficulty: '四级'
      }
    }),
    prisma.examplePool.create({
      data: {
        sentence: 'We can learn a lot from our mistakes.',
        source: 'AI生成',
        difficulty: '四级'
      }
    })
  ]);
  
  console.log(`✅ 创建了 ${examples.length} 个例句\n`);

  // ============================================
  // 3. 创建单词 1: word
  // ============================================
  console.log('📖 创建单词: word...');
  
  const word1 = await prisma.word.create({
    data: {
      word: 'word',
      pronunciation: JSON.stringify({
        uk: '/wɜːd/',
        us: '/wɝːd/'
      })
    }
  });

  // 词性: n. (名词)
  const word1Pos1 = await prisma.partOfSpeech.create({
    data: {
      wordId: word1.id,
      partOfSpeech: 'n.'
    }
  });

  // 词义1: 单词，词
  const word1Meaning1 = await prisma.meaning.create({
    data: {
      partOfSpeechId: word1Pos1.id,
      definition: '单词，词',
      relatedInfo: JSON.stringify({
        synonyms: ['term', 'expression'],
        examples: ['vocabulary', 'lexicon']
      })
    }
  });

  // 词义2: 话语，言语
  const word1Meaning2 = await prisma.meaning.create({
    data: {
      partOfSpeechId: word1Pos1.id,
      definition: '话语，言语',
      relatedInfo: JSON.stringify({
        phrase: 'have a word with sb.',
        meaning: '与某人谈话'
      })
    }
  });

  // 词性: v. (动词)
  const word1Pos2 = await prisma.partOfSpeech.create({
    data: {
      wordId: word1.id,
      partOfSpeech: 'v.'
    }
  });

  // 词义3: 措辞，用词表达
  await prisma.meaning.create({
    data: {
      partOfSpeechId: word1Pos2.id,
      definition: '措辞，用词表达'
    }
  });

  // 关联例句
  await prisma.meaningExampleRelation.createMany({
    data: [
      { meaningId: word1Meaning1.id, exampleId: examples[1].id, highlightWord: 'words', orderInMeaning: 1 },
      { meaningId: word1Meaning2.id, exampleId: examples[0].id, highlightWord: 'word', orderInMeaning: 1 }
    ]
  });

  // 关联词书
  await prisma.wordTagRelation.create({
    data: {
      wordId: word1.id,
      bookTagId: bookTag.id,
      masteryFocus: 'recognition'
    }
  });

  console.log('✅ 单词 "word" 创建完成（2个词性，3个词义，2个例句）\n');

  // ============================================
  // 4. 创建单词 2: study
  // ============================================
  console.log('📖 创建单词: study...');
  
  const word2 = await prisma.word.create({
    data: {
      word: 'study',
      pronunciation: JSON.stringify({
        uk: '/ˈstʌdi/',
        us: '/ˈstʌdi/'
      })
    }
  });

  // 词性: v. (动词)
  const word2Pos1 = await prisma.partOfSpeech.create({
    data: {
      wordId: word2.id,
      partOfSpeech: 'v.'
    }
  });

  const word2Meaning1 = await prisma.meaning.create({
    data: {
      partOfSpeechId: word2Pos1.id,
      definition: '学习，研究'
    }
  });

  // 词性: n. (名词)
  const word2Pos2 = await prisma.partOfSpeech.create({
    data: {
      wordId: word2.id,
      partOfSpeech: 'n.'
    }
  });

  const word2Meaning2 = await prisma.meaning.create({
    data: {
      partOfSpeechId: word2Pos2.id,
      definition: '学习，研究'
    }
  });

  await prisma.meaning.create({
    data: {
      partOfSpeechId: word2Pos2.id,
      definition: '书房'
    }
  });

  // 关联例句
  await prisma.meaningExampleRelation.createMany({
    data: [
      { meaningId: word2Meaning1.id, exampleId: examples[2].id, highlightWord: 'studying', orderInMeaning: 1 },
      { meaningId: word2Meaning2.id, exampleId: examples[3].id, highlightWord: 'study', orderInMeaning: 1 }
    ]
  });

  // 关联词书
  await prisma.wordTagRelation.create({
    data: {
      wordId: word2.id,
      bookTagId: bookTag.id,
      masteryFocus: 'production'
    }
  });

  console.log('✅ 单词 "study" 创建完成（2个词性，3个词义，2个例句）\n');

  // ============================================
  // 5. 创建单词 3: learn
  // ============================================
  console.log('📖 创建单词: learn...');
  
  const word3 = await prisma.word.create({
    data: {
      word: 'learn',
      pronunciation: JSON.stringify({
        uk: '/lɜːn/',
        us: '/lɝːn/'
      })
    }
  });

  // 词性: v. (动词)
  const word3Pos1 = await prisma.partOfSpeech.create({
    data: {
      wordId: word3.id,
      partOfSpeech: 'v.'
    }
  });

  const word3Meaning1 = await prisma.meaning.create({
    data: {
      partOfSpeechId: word3Pos1.id,
      definition: '学习，学会',
      relatedInfo: JSON.stringify({
        usage: 'learn + to do / learn + that从句',
        synonyms: ['acquire', 'master']
      })
    }
  });

  const word3Meaning2 = await prisma.meaning.create({
    data: {
      partOfSpeechId: word3Pos1.id,
      definition: '得知，获悉'
    }
  });

  // 关联例句
  await prisma.meaningExampleRelation.createMany({
    data: [
      { meaningId: word3Meaning1.id, exampleId: examples[4].id, highlightWord: 'learn', orderInMeaning: 1 },
      { meaningId: word3Meaning2.id, exampleId: examples[5].id, highlightWord: 'learn', orderInMeaning: 1 }
    ]
  });

  // 关联词书
  await prisma.wordTagRelation.create({
    data: {
      wordId: word3.id,
      bookTagId: bookTag.id,
      masteryFocus: 'recognition'
    }
  });

  console.log('✅ 单词 "learn" 创建完成（1个词性，2个词义，2个例句）\n');

  // ============================================
  // 6. 创建测试用户（用于API测试）
  // ============================================
  console.log('👤 创建测试用户...');
  
  const bcrypt = require('bcryptjs');
  const hashedPassword = await bcrypt.hash('test123456', 10);
  
  const testUser = await prisma.user.create({
    data: {
      username: 'testuser',
      passwordHash: hashedPassword,
      currentBookTagId: bookTag.id
    }
  });
  
  console.log(`✅ 测试用户创建成功: ${testUser.username}（密码: test123456）\n`);

  // ============================================
  // 7. 统计信息
  // ============================================
  const totalWords = await prisma.word.count();
  const totalMeanings = await prisma.meaning.count();
  const totalExamples = await prisma.examplePool.count();
  const totalBookTags = await prisma.bookTag.count();
  const totalUsers = await prisma.user.count();

  console.log('📊 数据统计：');
  console.log(`   - 用户数量: ${totalUsers}`);
  console.log(`   - 单词数量: ${totalWords}`);
  console.log(`   - 词义数量: ${totalMeanings}`);
  console.log(`   - 例句数量: ${totalExamples}`);
  console.log(`   - 词书标签: ${totalBookTags}`);
  console.log('\n✅ 种子数据填充完成！');
}

main()
  .catch((e) => {
    console.error('❌ 种子数据填充失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
