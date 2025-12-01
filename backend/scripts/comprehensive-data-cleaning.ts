import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import * as dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

const API_BASE_URL = 'https://api.siliconflow.cn/v1';

/**
 * 综合脏数据清洗脚本
 * 处理: 问题翻译、试卷格式、过短例句、无例句义项、过度复用
 */

// ============ AI 辅助函数 ============

async function translateSentence(sentence: string, word: string, pos: string, def: string): Promise<string | null> {
  const prompt = `你是一位精通中英互译的资深英语教师。请将下面的英文例句翻译成中文。

【核心单词】${word} (${pos} ${def})

【待翻例句】${sentence}

【严格约束】
1. 语境优先：译文必须通顺、自然，符合中文表达习惯。
2. 义项锁定：必须体现 "${def}" 的意思。
3. 格式纯净：只返回翻译后的中文句子，不要任何解释、注释或额外说明。`;

  try {
    const response = await axios.post(`${API_BASE_URL}/chat/completions`, {
      model: 'deepseek-ai/DeepSeek-V3',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 500
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.AI_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    return response.data.choices[0].message.content?.trim() || null;
  } catch (error: any) {
    console.error(`  ❌ AI 翻译失败: ${error.message}`);
    return null;
  }
}

async function generateExample(word: string, pos: string, def: string): Promise<{sentence: string, translation: string} | null> {
  const prompt = `你是一个专业的英语词汇专家。请为单词 "${word}" 生成一个例句。

要求：
1. 必须使用单词 "${word}"。
2. 必须体现其 "${pos} ${def}" 的含义。
3. 难度适合大学英语四级水平。
4. 只返回 JSON 格式，不要任何其他内容：{"sentence": "英文句子", "translation": "中文翻译"}`;

  try {
    const response = await axios.post(`${API_BASE_URL}/chat/completions`, {
      model: 'deepseek-ai/DeepSeek-V3',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.5,
      max_tokens: 300
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.AI_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    const content = response.data.choices[0].message.content?.trim();
    const match = content?.match(/\{[\s\S]*\}/);
    if (match) {
      return JSON.parse(match[0]);
    }
    return null;
  } catch (error: any) {
    console.error(`  ❌ AI 生成失败: ${error.message}`);
    return null;
  }
}

// ============ 清洗函数 ============

/**
 * 1. 清理问题翻译（包含多余解释的翻译）
 */
async function cleanBadTranslations() {
  console.log('\n📝 【1/5】清理问题翻译...');
  
  const badPatterns = ['然而，为了', '为了更符合', '需要注意', '请注意', '翻译如下', '这里的核心词', '所以这句话'];
  
  for (const pattern of badPatterns) {
    const badTranslations = await prisma.examplePool.findMany({
      where: { translation: { contains: pattern } },
      include: {
        meanings: {
          include: {
            meaning: { include: { word: true } }
          },
          take: 1
        }
      }
    });

    console.log(`   模式 "${pattern}": 找到 ${badTranslations.length} 条`);

    for (const ex of badTranslations) {
      const rel = ex.meanings[0];
      if (!rel) continue;
      
      const { word, partOfSpeech, definition } = rel.meaning;
      console.log(`   重新翻译 ID ${ex.id}: ${word.word}`);
      
      const newTranslation = await translateSentence(ex.sentence, word.word, partOfSpeech, definition);
      if (newTranslation && !badPatterns.some(p => newTranslation.includes(p))) {
        await prisma.examplePool.update({
          where: { id: ex.id },
          data: { translation: newTranslation }
        });
        console.log(`   ✅ 已修复`);
      } else {
        console.log(`   ⚠️ 仍有问题，跳过`);
      }
      
      await new Promise(r => setTimeout(r, 300));
    }
  }
}

/**
 * 2. 删除试卷格式例句
 */
async function cleanExamFormatSentences() {
  console.log('\n📝 【2/5】删除试卷格式例句...');
  
  const examPatterns = [
    '机密', '启用前', '试题册', 'COLLEGE ENGLISH TEST', 
    'Directions:', 'Section A', 'Section B', 'Section C',
    'Guided Writing', 'Grammar and Vocabulary'
  ];
  
  let totalDeleted = 0;
  
  for (const pattern of examPatterns) {
    const badExamples = await prisma.examplePool.findMany({
      where: { sentence: { contains: pattern } }
    });
    
    if (badExamples.length > 0) {
      console.log(`   模式 "${pattern}": 找到 ${badExamples.length} 条`);
      
      for (const ex of badExamples) {
        // 先删除关联
        await prisma.meaningExampleRelation.deleteMany({
          where: { exampleId: ex.id }
        });
        // 再删除例句
        await prisma.examplePool.delete({
          where: { id: ex.id }
        });
        totalDeleted++;
      }
    }
  }
  
  console.log(`   ✅ 共删除 ${totalDeleted} 条试卷格式例句`);
}

/**
 * 3. 删除过短碎片例句（<20字符）
 */
async function cleanShortSentences() {
  console.log('\n📝 【3/5】删除过短碎片例句...');
  
  const shortExamples = await prisma.$queryRaw<{id: number}[]>`
    SELECT id FROM example_pool WHERE CHAR_LENGTH(sentence) < 20
  `;
  
  console.log(`   找到 ${shortExamples.length} 条过短例句`);
  
  for (const ex of shortExamples) {
    await prisma.meaningExampleRelation.deleteMany({
      where: { exampleId: ex.id }
    });
    await prisma.examplePool.delete({
      where: { id: ex.id }
    });
  }
  
  console.log(`   ✅ 已删除 ${shortExamples.length} 条`);
}

/**
 * 4. 为无例句义项补充例句
 */
async function fillMissingExamples() {
  console.log('\n📝 【4/5】为无例句义项补充例句...');
  
  const meaningsWithoutExamples = await prisma.meaning.findMany({
    where: { examples: { none: {} } },
    include: { word: true }
  });
  
  console.log(`   找到 ${meaningsWithoutExamples.length} 个无例句义项`);
  
  for (const m of meaningsWithoutExamples) {
    console.log(`   生成: ${m.word.word} [${m.partOfSpeech}] ${m.definition}`);
    
    const result = await generateExample(m.word.word, m.partOfSpeech, m.definition);
    if (result) {
      const newExample = await prisma.examplePool.create({
        data: {
          sentence: result.sentence,
          translation: result.translation,
          sourceType: 'AI_GENERATED',
          sourceDetail: 'auto-fill-missing'
        }
      });
      
      await prisma.meaningExampleRelation.create({
        data: {
          meaningId: m.id,
          exampleId: newExample.id,
          isPrimary: true
        }
      });
      
      console.log(`   ✅ 已生成: ${result.sentence.substring(0, 50)}...`);
    }
    
    await new Promise(r => setTimeout(r, 300));
  }
}

/**
 * 5. 清理过度复用的例句关联（保留前2个）
 */
async function cleanOverusedExamples() {
  console.log('\n📝 【5/5】清理过度复用的例句关联...');
  
  const overused = await prisma.$queryRaw<{exampleId: number, cnt: bigint}[]>`
    SELECT example_id as exampleId, COUNT(*) as cnt
    FROM meaning_example_relation
    GROUP BY example_id
    HAVING COUNT(*) > 3
  `;
  
  console.log(`   找到 ${overused.length} 个被过度复用的例句`);
  
  let totalRemoved = 0;
  
  for (const item of overused) {
    const relations = await prisma.meaningExampleRelation.findMany({
      where: { exampleId: item.exampleId },
      orderBy: { meaningId: 'asc' }
    });
    
    // 保留前2个关联，删除其余
    const toDelete = relations.slice(2);
    for (const rel of toDelete) {
      await prisma.meaningExampleRelation.delete({
        where: {
          meaningId_exampleId: {
            meaningId: rel.meaningId,
            exampleId: rel.exampleId
          }
        }
      });
      totalRemoved++;
    }
  }
  
  console.log(`   ✅ 已删除 ${totalRemoved} 个多余关联`);
}

// ============ 主函数 ============

async function main() {
  console.log('='.repeat(80));
  console.log('🧹 综合脏数据清洗');
  console.log('='.repeat(80));
  
  await cleanBadTranslations();
  await cleanExamFormatSentences();
  await cleanShortSentences();
  await fillMissingExamples();
  await cleanOverusedExamples();
  
  console.log('\n' + '='.repeat(80));
  console.log('✅ 清洗完成！');
  console.log('='.repeat(80));
  
  // 重新统计
  const totalExamples = await prisma.examplePool.count();
  const totalMeanings = await prisma.meaning.count();
  const noExamples = await prisma.meaning.count({ where: { examples: { none: {} } } });
  const noTranslation = await prisma.examplePool.count({ where: { translation: null } });
  
  console.log(`\n📊 清洗后统计:`);
  console.log(`   例句总数: ${totalExamples}`);
  console.log(`   义项总数: ${totalMeanings}`);
  console.log(`   无例句义项: ${noExamples}`);
  console.log(`   无翻译例句: ${noTranslation}`);
  
  await prisma.$disconnect();
}

main().catch(e => {
  console.error('❌ 错误:', e);
  process.exit(1);
});
