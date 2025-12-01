import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import * as dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

/**
 * 翻译单个例句
 */
async function translateSentence(
  sentence: string,
  word: string,
  partOfSpeech: string,
  definition: string
): Promise<string | null> {
  const prompt = `你是一位精通中英互译的资深英语教师。请将下面的英文例句翻译成中文。

【核心单词】
单词：${word}
词性：${partOfSpeech}
含义：${definition}

【待翻例句】
${sentence}

【严格约束】
1. **语境优先**：译文必须通顺、自然，符合中文表达习惯，拒绝翻译腔。
2. **义项锁定**：**严禁**将核心词翻译成其他含义。必须体现 "${definition}" 的意思。
3. **格式纯净**：只返回翻译后的中文句子，不要任何解释。
`;

  try {
    const response = await axios.post(
      'https://api.siliconflow.cn/v1/chat/completions',
      {
        model: 'deepseek-ai/DeepSeek-V3',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 500
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.AI_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return response.data.choices[0].message.content?.trim() || null;
  } catch (error: any) {
    console.error(`  ❌ AI 翻译失败: ${error.message}`);
    return null;
  }
}

/**
 * 批量翻译缺失的例句
 */
async function translateMissingExamples() {
  console.log('🔍 查找缺失翻译的例句...\n');

  // 先查询总数
  const totalCount = await prisma.examplePool.count({
    where: { translation: null }
  });

  console.log(`📊 总共有 ${totalCount} 条缺失翻译的例句\n`);

  if (totalCount === 0) {
    console.log('✅ 所有例句都已有翻译！');
    await prisma.$disconnect();
    return;
  }

  let successCount = 0;
  let failCount = 0;
  let processedCount = 0;
  const batchSize = 50; // 每批处理50条

  console.log(`🚀 开始分批翻译，每批 ${batchSize} 条...\n`);

  while (processedCount < totalCount) {
    // 每次取一批
    const missingTranslations = await prisma.examplePool.findMany({
      where: {
        translation: null
      },
      include: {
        meanings: {
          include: {
            meaning: {
              include: {
                word: true
              }
            }
          },
          take: 1
        }
      },
      take: batchSize
    });

    if (missingTranslations.length === 0) break;

    console.log(`\n📦 处理第 ${Math.floor(processedCount / batchSize) + 1} 批 (${missingTranslations.length} 条)...`);

    for (let i = 0; i < missingTranslations.length; i++) {
      const example = missingTranslations[i];
      const relation = example.meanings[0];

      if (!relation) {
        console.log(`⚠️ [${processedCount + i + 1}/${totalCount}] ID ${example.id} 没有关联的含义，跳过`);
        failCount++;
        continue;
      }

      const meaning = relation.meaning;
      const word = meaning.word;

      console.log(`[${processedCount + i + 1}/${totalCount}] ${word.word} (${meaning.partOfSpeech})`);

      // 调用 AI 翻译
      const translation = await translateSentence(
        example.sentence,
        word.word,
        meaning.partOfSpeech,
        meaning.definition
      );

      if (translation) {
        // 更新数据库
        await prisma.examplePool.update({
          where: { id: example.id },
          data: { translation }
        });

        successCount++;
      } else {
        failCount++;
      }

      // 延迟避免 API 限流
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    processedCount += missingTranslations.length;
    console.log(`✅ 第 ${Math.floor(processedCount / batchSize)} 批完成 (成功: ${successCount}, 失败: ${failCount})`);
  }

  console.log(`\n\n📊 翻译完成！`);
  console.log(`✅ 成功: ${successCount}`);
  console.log(`❌ 失败: ${failCount}`);
  console.log(`📝 总计: ${processedCount}`);

  // 检查剩余未翻译的数量
  const remaining = await prisma.examplePool.count({
    where: { translation: null }
  });

  if (remaining > 0) {
    console.log(`\n⚠️ 还有 ${remaining} 条例句未翻译，请再次运行此脚本继续处理。`);
  } else {
    console.log(`\n🎉 所有例句翻译完成！`);
  }

  await prisma.$disconnect();
}

translateMissingExamples().catch(console.error);
