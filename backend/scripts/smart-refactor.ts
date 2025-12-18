
import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

// 加载环境变量
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const prisma = new PrismaClient();

// 配置
const BATCH_SIZE = 10; // 每次处理的单词数
const MODEL_NAME = 'deepseek-ai/DeepSeek-V3'; // 或者 'Qwen/Qwen2.5-7B-Instruct'
const API_URL = 'https://api.siliconflow.cn/v1/chat/completions';
const API_KEY = process.env.SILICONFLOW_API_KEY;

if (!API_KEY) {
  console.error('❌ 错误: 未找到 SILICONFLOW_API_KEY 环境变量');
  process.exit(1);
}

interface AIResponse {
  word: string;
  phonetic: {
    us: string;
    uk: string;
  };
  meanings: {
    partOfSpeech: string;
    definition: string; // 英文释义 ; 中文释义
    generatedExamples: {
      sentence: string;
      translation: string;
    }[];
    // 这是一个索引数组，指向我们发送给 AI 的旧例句列表
    matchedLegacyExampleIndices: number[];
    // 新增：混淆选项
    distractors: {
      cn: string[]; // 中文干扰项
      en: string[]; // 英文干扰项
    };
  }[];
}

async function processBatch(words: any[]) {
  for (const word of words) {
    // 0. 检查是否已处理 (断点续传功能)
    // 如果单词已有释义，且释义中包含 distractors (混淆项)，则视为已完成
    const isRefactored = word.meanings.length > 0 && word.meanings.every((m: any) => 
      m.extra && typeof m.extra === 'object' && 'distractors' in m.extra
    );

    if (isRefactored) {
      // console.log(`⏭️  跳过已完成: ${word.word}`); // 减少日志刷屏，可选开启
      continue;
    }

    console.log(`\n🔄 正在处理单词: ${word.word} (ID: ${word.id})...`);

    // 1. 收集该单词现有的所有例句 (Legacy Examples)
    const legacyExamples: { id: number; sentence: string; source: string }[] = [];
    for (const m of word.meanings) {
      for (const rel of m.examples) {
        if (rel.example) {
          legacyExamples.push({
            id: rel.example.id,
            sentence: rel.example.sentence,
            source: rel.example.sourceType || 'unknown',
          });
        }
      }
    }

    // 去重
    const uniqueLegacyExamples = legacyExamples.filter(
      (ex, index, self) =>
        index === self.findIndex((t) => t.sentence === ex.sentence)
    );

    console.log(`   - 发现 ${uniqueLegacyExamples.length} 个旧例句`);

    // 2. 构建 Prompt
    const prompt = `
你是一位严谨的词典编纂专家。请基于权威词典（如 Oxford Advanced Learner's Dictionary, Cambridge Dictionary, Merriam-Webster）的数据，重构单词 "${word.word}"。

核心原则：
1. **准确性优先 (Anti-Hallucination)**：
   - 仅输出权威词典中存在的常用释义。
   - 严禁编造释义。如果单词含义较少，不要强行凑数。
   - 忽略极其生僻或古旧的用法。
2. **中英对照**：定义必须包含英文原文和中文翻译。
3. **真题匹配**：必须仔细分析我提供的“旧例句”，将其归类到最准确的释义下。
4. **高质量干扰项 (High-Quality Distractors)**：
   - **优先级 (Priority)**：
     1. **近义混淆词 (Synonyms/Confusing Words)**：意思相近但在此语境下不准确的词（如 "see" vs "watch" vs "look"）。
     2. **形近词 (Look-alike Words)**：拼写相似容易看错的词（如 "adapt" vs "adopt"）。
     3. **同类词 (Same Category Words)**：属于同一范畴的词（如 "apple" vs "pear"）。
   - **严禁使用简单的反义词** (Strictly NO Antonyms)。
     - 错误示例：如果词是 "Hot" (热)，干扰项绝不能是 "Cold" (冷)。
     - 正确思路：应使用 "Wet" (湿), "Windy" (多风) [同类天气词] 或 "Warm" (暖) [近义程度不同]。
   - **干扰项生成策略**：
     - **名词 (Nouns)**: 使用同类事物 (Co-hyponyms)。如 "Apple" -> "Banana", "Grape".
     - **动词 (Verbs)**: 使用同类动作。如 "Run" (跑) -> "Jump" (跳), "Swim" (游), "Climb" (爬)。绝不能用 "Stop" (停)。
     - **形容词 (Adjectives)**: 使用同类描述。如 "Red" (红) -> "Blue", "Green". 如 "Happy" (高兴) -> "Lucky" (幸运), "Healthy" (健康)。绝不能用 "Sad" (伤心)。
   - 干扰项必须与正确释义**词性一致**。

任务详情：
1. **音标**：提供准确的美式 (US) 和英式 (UK) IPA 音标。
2. **释义拆分**：将单词拆分为多个具体的含义 (Meanings)。
   - 格式：英文定义 ; 中文定义
   - 示例：To move fast on foot ; 跑，奔跑
3. **例句生成**：为每个释义生成 1 个符合 CEFR B1/B2 难度的例句，确保地道。
4. **混淆选项 (Distractors)**：为每个释义生成 3 个中文干扰项和 3 个英文干扰项。
5. **旧例句归类**：分析下方的 [Legacy Examples]，返回它们对应的释义索引。

旧例句列表 (Legacy Examples):
${JSON.stringify(uniqueLegacyExamples.map((e, i) => ({ index: i, sentence: e.sentence })), null, 2)}

One-Shot Example (参考范例):
Input Word: "bank"
Output JSON:
{
  "word": "bank",
  "phonetic": { "us": "/bæŋk/", "uk": "/bæŋk/" },
  "meanings": [
    {
      "partOfSpeech": "n.",
      "definition": "An organization that provides various financial services ; 银行",
      "generatedExamples": [
        { "sentence": "I need to go to the bank to withdraw some money.", "translation": "我需要去银行取点钱。" }
      ],
      "distractors": {
        "cn": ["超市", "邮局", "图书馆"], // 同类地点名词，而非反义词
        "en": ["Supermarket", "Post office", "Library"]
      },
      "matchedLegacyExampleIndices": [] 
    },
    {
      "partOfSpeech": "n.",
      "definition": "The side of a river, canal, etc. and the land near it ; 河岸，堤岸",
      "generatedExamples": [
        { "sentence": "They sat on the river bank and watched the boats go by.", "translation": "他们坐在河岸边看着船只经过。" }
      ],
      "distractors": {
        "cn": ["海滩", "山坡", "悬崖"], // 同类地理名词
        "en": ["Beach", "Hillside", "Cliff"]
      },
      "matchedLegacyExampleIndices": [] 
    }
  ]
}

请严格返回以下 JSON 格式 (不要包含 Markdown 代码块标记):
{
  "word": "${word.word}",
  "phonetic": { "us": "...", "uk": "..." },
  "meanings": [
    {
      "partOfSpeech": "...",
      "definition": "...",
      "generatedExamples": [...],
      "distractors": { "cn": [...], "en": [...] },
      "matchedLegacyExampleIndices": [...] 
    }
  ]
}
`;

    try {
      // 3. 调用 AI
      const response = await axios.post(
        API_URL,
        {
          model: MODEL_NAME,
          messages: [
            { role: 'system', content: 'You are a helpful assistant that outputs JSON only.' },
            { role: 'user', content: prompt },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.3,
        },
        {
          headers: {
            Authorization: `Bearer ${API_KEY}`,
            'Content-Type': 'application/json',
          },
          timeout: 60000, // 60s timeout
        }
      );

      const content = response.data.choices[0].message.content;
      // 清理可能的 markdown 标记
      const jsonStr = content.replace(/```json/g, '').replace(/```/g, '').trim();
      const aiData: AIResponse = JSON.parse(jsonStr);

      // 4. 数据库更新 (事务)
      await prisma.$transaction(async (tx) => {
        // A. 更新单词音标
        await tx.word.update({
          where: { id: word.id },
          data: {
            pronunciation: aiData.phonetic,
          },
        });

        // B. 删除旧释义 (注意：这会级联删除 UserLearningProgress，这是重构的代价)
        // 为了保留旧例句本身 (ExamplePool)，我们不需要删除 ExamplePool，只需要删除 Meaning
        // Meaning 删除会自动删除 MeaningExampleRelation
        await tx.meaning.deleteMany({
          where: { wordId: word.id },
        });

        // C. 创建新释义
        for (const meaningData of aiData.meanings) {
          // 创建 Meaning
          const newMeaning = await tx.meaning.create({
            data: {
              wordId: word.id,
              partOfSpeech: meaningData.partOfSpeech,
              definition: meaningData.definition,
              extra: {
                distractors: meaningData.distractors // 存储混淆选项
              }
            },
          });

          // 记录该释义下已关联的 Example ID，防止重复关联
          const linkedExampleIds = new Set<number>();

          // C1. 插入新生成的例句
          for (const genEx of meaningData.generatedExamples) {
            // 检查池中是否已存在
            let examplePoolId: number;
            const existingEx = await tx.examplePool.findFirst({
              where: { sentence: genEx.sentence },
            });

            if (existingEx) {
              examplePoolId = existingEx.id;
            } else {
              const newEx = await tx.examplePool.create({
                data: {
                  sentence: genEx.sentence,
                  translation: genEx.translation,
                  sourceType: 'ai_generated',
                  sourceDetail: MODEL_NAME,
                },
              });
              examplePoolId = newEx.id;
            }

            // 关联 (如果尚未关联)
            if (!linkedExampleIds.has(examplePoolId)) {
              await tx.meaningExampleRelation.create({
                data: {
                  meaningId: newMeaning.id,
                  exampleId: examplePoolId,
                  isPrimary: true, // 新生成的设为首选
                },
              });
              linkedExampleIds.add(examplePoolId);
            }
          }

          // C2. 关联旧例句
          if (meaningData.matchedLegacyExampleIndices) {
            // 去重：确保同一个旧例句不会被重复关联到同一个释义
            const uniqueIndices = [...new Set(meaningData.matchedLegacyExampleIndices)];
            
            for (const idx of uniqueIndices) {
              const legacyEx = uniqueLegacyExamples[idx];
              if (legacyEx) {
                // 如果该例句 ID 已经被 C1 关联过了（因为 AI 生成了完全一样的句子），则跳过
                if (linkedExampleIds.has(legacyEx.id)) {
                  continue;
                }

                // 关联旧例句到新释义
                await tx.meaningExampleRelation.create({
                  data: {
                    meaningId: newMeaning.id,
                    exampleId: legacyEx.id,
                    isPrimary: false, // 旧例句作为补充
                  },
                });
                linkedExampleIds.add(legacyEx.id);
              }
            }
          }
        }
      });

      console.log(`   ✅ 成功重构: ${word.word}`);

    } catch (error: any) {
      console.error(`   ❌ 处理失败 ${word.word}:`, error.message);
      if (error.response) {
        console.error('   API Response:', error.response.data);
      }
    }
  }
}

async function main() {
  console.log('🚀 开始智能重构任务...');
  
  // 获取需要处理的单词
  // 全量处理所有单词
  const words = await prisma.word.findMany({
    orderBy: { id: 'asc' },
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

  console.log(`📊 找到 ${words.length} 个单词待处理`);

  await processBatch(words);

  console.log('🏁 任务完成');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
