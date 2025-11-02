/**
 * 导入六级词书数据
 * 包含50个高频六级单词作为测试数据
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 六级词书的50个高频单词（带词义和例句）
const cet6Words = [
  {
    word: 'abandon',
    meanings: [
      { pos: 'v.', text: '放弃；抛弃', example: 'They had to abandon their home because of the flood.' },
      { pos: 'v.', text: '放纵；沉溺', example: 'He abandoned himself to despair after the failure.' }
    ]
  },
  {
    word: 'abstract',
    meanings: [
      { pos: 'adj.', text: '抽象的', example: 'Abstract art is difficult to understand for some people.' },
      { pos: 'n.', text: '摘要', example: 'Please write an abstract for your research paper.' }
    ]
  },
  {
    word: 'abundant',
    meanings: [
      { pos: 'adj.', text: '丰富的；充裕的', example: 'The region has abundant natural resources.' }
    ]
  },
  {
    word: 'accelerate',
    meanings: [
      { pos: 'v.', text: '加速；促进', example: 'The new policy will accelerate economic growth.' }
    ]
  },
  {
    word: 'accessible',
    meanings: [
      { pos: 'adj.', text: '可接近的；易理解的', example: 'The library is accessible to all students.' }
    ]
  },
  {
    word: 'accommodate',
    meanings: [
      { pos: 'v.', text: '容纳；为…提供住宿', example: 'This hotel can accommodate 200 guests.' },
      { pos: 'v.', text: '适应；迎合', example: 'We should accommodate ourselves to the new environment.' }
    ]
  },
  {
    word: 'accomplish',
    meanings: [
      { pos: 'v.', text: '完成；实现', example: 'She accomplished her goal of learning Chinese.' }
    ]
  },
  {
    word: 'accumulate',
    meanings: [
      { pos: 'v.', text: '积累；积聚', example: 'He has accumulated a lot of experience over the years.' }
    ]
  },
  {
    word: 'accurate',
    meanings: [
      { pos: 'adj.', text: '准确的；精确的', example: 'Please provide accurate information on the form.' }
    ]
  },
  {
    word: 'acknowledge',
    meanings: [
      { pos: 'v.', text: '承认；致谢', example: 'He acknowledged his mistake immediately.' }
    ]
  },
  {
    word: 'acquire',
    meanings: [
      { pos: 'v.', text: '获得；学到', example: 'Children acquire language naturally through exposure.' }
    ]
  },
  {
    word: 'adequate',
    meanings: [
      { pos: 'adj.', text: '足够的；适当的', example: 'Make sure you have adequate preparation before the exam.' }
    ]
  },
  {
    word: 'adjust',
    meanings: [
      { pos: 'v.', text: '调整；适应', example: 'It took me several months to adjust to the new job.' }
    ]
  },
  {
    word: 'advocate',
    meanings: [
      { pos: 'v.', text: '提倡；拥护', example: 'Many scientists advocate reducing carbon emissions.' },
      { pos: 'n.', text: '提倡者；拥护者', example: 'She is a strong advocate for human rights.' }
    ]
  },
  {
    word: 'alternative',
    meanings: [
      { pos: 'adj.', text: '可替代的', example: 'We need to find alternative sources of energy.' },
      { pos: 'n.', text: '替代方案', example: 'There is no alternative but to start over.' }
    ]
  },
  {
    word: 'ambiguous',
    meanings: [
      { pos: 'adj.', text: '模棱两可的；含糊的', example: 'His answer was ambiguous and confusing.' }
    ]
  },
  {
    word: 'ambition',
    meanings: [
      { pos: 'n.', text: '雄心；野心', example: 'Her ambition is to become a successful entrepreneur.' }
    ]
  },
  {
    word: 'anticipate',
    meanings: [
      { pos: 'v.', text: '预期；期望', example: 'We anticipate that sales will increase next quarter.' }
    ]
  },
  {
    word: 'apparent',
    meanings: [
      { pos: 'adj.', text: '明显的；表面上的', example: 'It was apparent that he was lying.' }
    ]
  },
  {
    word: 'approach',
    meanings: [
      { pos: 'v.', text: '接近；靠近', example: 'Winter is approaching and the weather is getting colder.' },
      { pos: 'n.', text: '方法；途径', example: 'We need a new approach to solve this problem.' }
    ]
  },
  {
    word: 'appropriate',
    meanings: [
      { pos: 'adj.', text: '适当的；恰当的', example: 'Please wear appropriate clothing for the interview.' }
    ]
  },
  {
    word: 'arbitrary',
    meanings: [
      { pos: 'adj.', text: '任意的；武断的', example: 'The decision seemed arbitrary and unfair.' }
    ]
  },
  {
    word: 'artificial',
    meanings: [
      { pos: 'adj.', text: '人造的；人工的', example: 'Artificial intelligence is changing our lives.' }
    ]
  },
  {
    word: 'assess',
    meanings: [
      { pos: 'v.', text: '评估；评价', example: 'Teachers need to assess students\' progress regularly.' }
    ]
  },
  {
    word: 'assign',
    meanings: [
      { pos: 'v.', text: '分配；指派', example: 'The teacher assigned homework to each student.' }
    ]
  },
  {
    word: 'assist',
    meanings: [
      { pos: 'v.', text: '帮助；协助', example: 'Can you assist me with this heavy box?' }
    ]
  },
  {
    word: 'assume',
    meanings: [
      { pos: 'v.', text: '假设；认为', example: 'I assume you have finished your work.' },
      { pos: 'v.', text: '承担；担任', example: 'He will assume the role of CEO next month.' }
    ]
  },
  {
    word: 'assure',
    meanings: [
      { pos: 'v.', text: '保证；使确信', example: 'I can assure you that everything will be fine.' }
    ]
  },
  {
    word: 'attribute',
    meanings: [
      { pos: 'v.', text: '把…归因于', example: 'She attributes her success to hard work.' },
      { pos: 'n.', text: '属性；特征', example: 'Patience is an important attribute for teachers.' }
    ]
  },
  {
    word: 'authority',
    meanings: [
      { pos: 'n.', text: '权威；当局', example: 'The health authorities issued a warning.' }
    ]
  },
  {
    word: 'automatic',
    meanings: [
      { pos: 'adj.', text: '自动的', example: 'The doors open automatically when you approach.' }
    ]
  },
  {
    word: 'available',
    meanings: [
      { pos: 'adj.', text: '可获得的；有空的', example: 'This product is available in several colors.' }
    ]
  },
  {
    word: 'aware',
    meanings: [
      { pos: 'adj.', text: '意识到的；知道的', example: 'Are you aware of the risks involved?' }
    ]
  },
  {
    word: 'behalf',
    meanings: [
      { pos: 'n.', text: '代表；利益', example: 'I am writing on behalf of the company.' }
    ]
  },
  {
    word: 'beneficial',
    meanings: [
      { pos: 'adj.', text: '有益的；有利的', example: 'Regular exercise is beneficial to your health.' }
    ]
  },
  {
    word: 'bias',
    meanings: [
      { pos: 'n.', text: '偏见；偏向', example: 'We must avoid bias in our research.' }
    ]
  },
  {
    word: 'capacity',
    meanings: [
      { pos: 'n.', text: '能力；容量', example: 'The stadium has a capacity of 50,000 people.' }
    ]
  },
  {
    word: 'cease',
    meanings: [
      { pos: 'v.', text: '停止；终止', example: 'The factory ceased production last year.' }
    ]
  },
  {
    word: 'challenge',
    meanings: [
      { pos: 'n.', text: '挑战', example: 'Learning a new language is always a challenge.' },
      { pos: 'v.', text: '向…挑战', example: 'This job will challenge your abilities.' }
    ]
  },
  {
    word: 'circumstance',
    meanings: [
      { pos: 'n.', text: '情况；环境', example: 'Under no circumstances should you give up.' }
    ]
  },
  {
    word: 'cite',
    meanings: [
      { pos: 'v.', text: '引用；举例', example: 'The author cited several studies in his paper.' }
    ]
  },
  {
    word: 'clarify',
    meanings: [
      { pos: 'v.', text: '澄清；阐明', example: 'Could you clarify what you mean by that?' }
    ]
  },
  {
    word: 'colleague',
    meanings: [
      { pos: 'n.', text: '同事', example: 'I discussed the project with my colleagues.' }
    ]
  },
  {
    word: 'commit',
    meanings: [
      { pos: 'v.', text: '犯罪；承诺', example: 'He committed himself to finishing the project on time.' }
    ]
  },
  {
    word: 'compensate',
    meanings: [
      { pos: 'v.', text: '补偿；赔偿', example: 'The company will compensate you for your losses.' }
    ]
  },
  {
    word: 'competent',
    meanings: [
      { pos: 'adj.', text: '有能力的；胜任的', example: 'She is a competent manager with years of experience.' }
    ]
  },
  {
    word: 'component',
    meanings: [
      { pos: 'n.', text: '组成部分；成分', example: 'Trust is an important component of friendship.' }
    ]
  },
  {
    word: 'comprehensive',
    meanings: [
      { pos: 'adj.', text: '综合的；全面的', example: 'The book provides a comprehensive overview of the subject.' }
    ]
  },
  {
    word: 'comprise',
    meanings: [
      { pos: 'v.', text: '包含；由…组成', example: 'The committee comprises representatives from six countries.' }
    ]
  },
  {
    word: 'conceive',
    meanings: [
      { pos: 'v.', text: '构想；怀孕', example: 'It is hard to conceive of life without electricity.' }
    ]
  }
];

async function importCET6Book() {
  try {
    console.log('🚀 开始导入六级词书数据...\n');

    // 1. 创建六级词书标签
    console.log('📚 Step 1: 创建六级词书标签...');
    const bookTag = await prisma.bookTag.create({
      data: {
        tagName: '大学英语六级核心词汇',
        isUserDefined: false
      }
    });
    console.log(`✅ 词书创建成功！ID: ${bookTag.id}\n`);

    // 2. 逐个导入单词
    console.log('📝 Step 2: 导入单词数据...');
    let importedCount = 0;

    for (const wordData of cet6Words) {
      try {
        // 创建单词
        const word = await prisma.word.create({
          data: {
            word: wordData.word,
            pronunciation: JSON.stringify({ uk: '', us: '' }) // 暂时为空
          }
        });

        // 创建词义和例句
        for (const meaningData of wordData.meanings) {
          // 创建词性
          const pos = await prisma.partOfSpeech.create({
            data: {
              wordId: word.id,
              partOfSpeech: meaningData.pos
            }
          });

          // 创建词义
          const meaning = await prisma.meaning.create({
            data: {
              partOfSpeechId: pos.id,
              definition: meaningData.text
            }
          });

          // 创建例句（先创建到例句池，再关联到词义）
          const example = await prisma.examplePool.create({
            data: {
              sentence: meaningData.example,
              source: '词典',
              difficulty: '六级'
            }
          });

          // 关联例句到词义
          await prisma.meaningExampleRelation.create({
            data: {
              meaningId: meaning.id,
              exampleId: example.id,
              highlightWord: wordData.word
            }
          });
        }

        // 关联单词到词书
        await prisma.wordTagRelation.create({
          data: {
            wordId: word.id,
            bookTagId: bookTag.id,
            masteryFocus: 'recognition' // 默认识记模式
          }
        });

        importedCount++;
        if (importedCount % 10 === 0) {
          console.log(`   已导入 ${importedCount}/${cet6Words.length} 个单词...`);
        }
      } catch (error) {
        console.error(`❌ 导入单词 "${wordData.word}" 失败:`, error);
      }
    }

    console.log(`\n✅ 成功导入 ${importedCount} 个单词！`);

    // 3. 验证导入结果
    console.log('\n📊 Step 3: 验证导入结果...');
    const wordCount = await prisma.wordTagRelation.count({
      where: { bookTagId: bookTag.id }
    });
    console.log(`   词书包含单词数: ${wordCount}`);

    console.log('\n🎉 六级词书导入完成！');
    console.log('\n💡 提示：');
    console.log('   1. 前往用户设置页面');
    console.log('   2. 切换到"大学英语六级核心词汇"');
    console.log('   3. 开始学习测试！');

  } catch (error) {
    console.error('\n❌ 导入失败:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// 执行导入
importCET6Book()
  .catch((error) => {
    console.error('脚本执行失败:', error);
    process.exit(1);
  });
