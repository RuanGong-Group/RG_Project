import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * 数据质量审计脚本
 * 检测各类脏数据问题
 */
async function auditDataQuality() {
  console.log('='.repeat(80));
  console.log('📊 数据质量审计报告');
  console.log('='.repeat(80));

  // 1. 检查翻译中包含多余解释性文字
  console.log('\n【1. 翻译中包含多余解释】');
  const badTranslations = await prisma.examplePool.findMany({
    where: {
      OR: [
        { translation: { contains: '然而，为了' } },
        { translation: { contains: '为了更符合' } },
        { translation: { contains: '我将' } },
        { translation: { contains: '需要注意' } },
        { translation: { contains: '请注意' } },
        { translation: { contains: '翻译如下' } },
        { translation: { contains: '译文' } },
        { translation: { contains: '原文' } },
      ]
    },
    take: 20
  });
  console.log(`   发现 ${badTranslations.length} 条问题翻译`);
  for (const t of badTranslations.slice(0, 5)) {
    console.log(`   ID ${t.id}: ${t.translation?.substring(0, 60)}...`);
  }

  // 2. 检查例句是试卷格式文本
  console.log('\n【2. 例句包含试卷格式文本】');
  const examFormatSentences = await prisma.examplePool.findMany({
    where: {
      OR: [
        { sentence: { contains: '机密' } },
        { sentence: { contains: '启用前' } },
        { sentence: { contains: '试题册' } },
        { sentence: { contains: 'COLLEGE ENGLISH TEST' } },
        { sentence: { contains: 'Questions' } },
        { sentence: { contains: 'Directions:' } },
      ]
    },
    take: 20
  });
  console.log(`   发现 ${examFormatSentences.length} 条试卷格式例句`);
  for (const s of examFormatSentences.slice(0, 5)) {
    console.log(`   ID ${s.id}: ${s.sentence.substring(0, 60)}...`);
  }

  // 3. 检查过短的例句（可能是碎片）
  console.log('\n【3. 过短例句（<15字符）】');
  const shortSentences = await prisma.examplePool.findMany({
    where: {
      sentence: { not: { contains: ' ' } } // 单词
    },
    take: 20
  });
  const reallyShort = await prisma.$queryRaw<{id: number, sentence: string}[]>`
    SELECT id, sentence FROM example_pool WHERE CHAR_LENGTH(sentence) < 15 LIMIT 20
  `;
  console.log(`   发现 ${reallyShort.length} 条过短例句`);
  for (const s of reallyShort.slice(0, 5)) {
    console.log(`   ID ${s.id}: "${s.sentence}"`);
  }

  // 4. 检查无例句的义项
  console.log('\n【4. 无例句的义项】');
  const meaningsWithoutExamples = await prisma.meaning.findMany({
    where: {
      examples: { none: {} }
    },
    include: {
      word: true
    },
    take: 50
  });
  console.log(`   发现 ${meaningsWithoutExamples.length} 个无例句的义项`);
  for (const m of meaningsWithoutExamples.slice(0, 10)) {
    console.log(`   ${m.word.word} [${m.partOfSpeech}] ${m.definition}`);
  }

  // 5. 检查重复例句（同一个例句关联到多个义项）
  console.log('\n【5. 重复关联的例句（同一例句关联多个义项）】');
  const duplicateRelations = await prisma.$queryRaw<{exampleId: number, cnt: number, sentence: string}[]>`
    SELECT mer.example_id as exampleId, COUNT(*) as cnt, ep.sentence
    FROM meaning_example_relation mer
    JOIN example_pool ep ON mer.example_id = ep.id
    GROUP BY mer.example_id
    HAVING COUNT(*) > 2
    ORDER BY cnt DESC
    LIMIT 20
  `;
  console.log(`   发现 ${duplicateRelations.length} 个被过度复用的例句`);
  for (const d of duplicateRelations.slice(0, 5)) {
    console.log(`   ID ${d.exampleId} (关联${d.cnt}次): ${d.sentence.substring(0, 50)}...`);
  }

  // 6. 检查翻译为空但例句非空
  console.log('\n【6. 有例句但无翻译】');
  const noTranslation = await prisma.examplePool.count({
    where: {
      translation: null,
      sentence: { not: '' }
    }
  });
  console.log(`   发现 ${noTranslation} 条无翻译的例句`);

  // 7. 检查特殊字符
  console.log('\n【7. 包含特殊字符的例句】');
  const specialChars = await prisma.examplePool.findMany({
    where: {
      OR: [
        { sentence: { contains: '^' } },
        { sentence: { contains: '___' } }, // 填空
        { sentence: { contains: '（' } },  // 中文括号
        { sentence: { contains: '）' } },
      ]
    },
    take: 20
  });
  console.log(`   发现 ${specialChars.length} 条包含特殊字符的例句`);
  for (const s of specialChars.slice(0, 5)) {
    console.log(`   ID ${s.id}: ${s.sentence.substring(0, 60)}...`);
  }

  // 总结
  console.log('\n' + '='.repeat(80));
  console.log('📋 审计总结');
  console.log('='.repeat(80));
  const totalExamples = await prisma.examplePool.count();
  const totalMeanings = await prisma.meaning.count();
  console.log(`   例句总数: ${totalExamples}`);
  console.log(`   义项总数: ${totalMeanings}`);
  console.log(`   无例句义项: ${meaningsWithoutExamples.length}+`);
  console.log(`   无翻译例句: ${noTranslation}`);
  console.log(`   问题翻译: ${badTranslations.length}+`);
  console.log(`   试卷格式: ${examFormatSentences.length}+`);

  await prisma.$disconnect();
}

auditDataQuality().catch(e => {
  console.error('❌ 错误:', e);
  process.exit(1);
});
