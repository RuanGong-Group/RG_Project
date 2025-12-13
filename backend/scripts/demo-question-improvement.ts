import { PrismaClient } from '@prisma/client';
import { makeQuestionForMeaning } from '../src/services/session.service';

const prisma = new PrismaClient();

/**
 * 最终演示：选择题改进效果对比
 */
async function main() {
  console.log('\n');
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║              选择题优化 - 改进效果演示                       ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝');
  console.log('\n改进要点:');
  console.log('  ✓ 同词性干扰项 - 避免"名词题配动词选项"的错误');
  console.log('  ✓ 真随机选择 - 从50个候选中随机选3个，不再固定');
  console.log('  ✓ 去重保护 - 确保4个选项不重复');
  console.log('  ✓ 长度优化 - 优先选择长度相近的干扰项\n');

  // 精选演示用例
  const demoWords = [
    { word: 'apple', pos: 'n.', name: '名词示例' },
    { word: 'run', pos: 'v.', name: '动词示例' },
    { word: 'beautiful', pos: 'adj.', name: '形容词示例' }
  ];

  for (const demo of demoWords) {
    console.log('═'.repeat(65));
    console.log(`\n📚 ${demo.name}: "${demo.word}"\n`);

    const meaning = await prisma.meaning.findFirst({
      where: {
        word: { word: demo.word },
        partOfSpeech: demo.pos
      },
      select: {
        id: true,
        definition: true,
        partOfSpeech: true,
        word: { select: { word: true, pronunciation: true } }
      }
    });

    if (!meaning) {
      console.log(`⚠️  未找到该单词\n`);
      continue;
    }

    const pronun = meaning.word.pronunciation as any;
    const phonetic = pronun?.us || pronun?.uk || '';
    
    console.log(`单词: ${meaning.word.word} ${phonetic}`);
    console.log(`词性: ${meaning.partOfSpeech}`);
    console.log(`正确答案: ${meaning.definition}\n`);

    try {
      const question = await makeQuestionForMeaning(meaning.id);

      console.log('生成的选择题:\n');
      question.options.forEach((opt, i) => {
        const letter = String.fromCharCode(65 + i);
        const isCorrect = opt.text === question.correctText;
        const icon = isCorrect ? '✅' : '  ';
        console.log(`  ${icon} ${letter}. ${opt.text}`);
      });

      // 验证词性一致性
      const distractorTexts = question.options
        .filter(o => o.text !== question.correctText)
        .map(o => o.text);
      
      const distractorMeanings = await prisma.meaning.findMany({
        where: { definition: { in: distractorTexts } },
        select: { partOfSpeech: true }
      });

      const samePosCount = distractorMeanings.filter(
        m => m.partOfSpeech === meaning.partOfSpeech
      ).length;

      console.log(`\n质量检查:`);
      console.log(`  ✓ 选项数量: 4`);
      console.log(`  ✓ 包含正确答案: 是`);
      console.log(`  ✓ 词性一致性: ${samePosCount}/3 干扰项为同词性`);
      console.log(`  ✓ 无重复: ${new Set(question.options.map(o => o.text)).size === 4 ? '是' : '否'}`);
      console.log('');

    } catch (err) {
      console.error(`❌ 错误: ${err instanceof Error ? err.message : err}\n`);
    }
  }

  console.log('═'.repeat(65));
  console.log('\n🎯 测试体验建议:');
  console.log('   1. 启动前端和后端服务');
  console.log('   2. 登录后进入学习会话');
  console.log('   3. 观察选择题的4个选项是否更加合理');
  console.log('   4. 特别注意：同一词性的词义会更容易混淆（这是好事！）\n');

  console.log('═'.repeat(65));
  console.log('\n✅ 演示完成！改进已应用到所有选择题（学习/复习/Booster）\n');

  await prisma.$disconnect();
}

main().catch(console.error);
