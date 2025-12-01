import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

// 配置接口
interface Config {
  bookName: string;
  wordSource: string;
  corpusBase: string;
  sourceType: string;
  minMatchScore: number;
}

// 语料库条目接口
interface CorpusItem {
  sentence: string;
  source: string;
}

// 单词数据接口
interface WordData {
  word: string;
  pronunciation?: any;
  lemma?: string;
  meanings: {
    partOfSpeech: string;
    definition: string;
    extra?: any;
  }[];
}

// 高频功能词黑名单 (用于跳过匹配，避免匹配到 'a', 'the' 等)
const STOPWORDS = new Set([
  'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'can', 'could', 'will', 'would',
  'shall', 'should', 'may', 'might', 'must', 'of', 'in', 'on', 'at', 'to',
  'for', 'with', 'by', 'from', 'as', 'into', 'through', 'during', 'before',
  'after', 'above', 'below', 'between', 'under', 'again', 'further', 'then',
  'once', 'here', 'there', 'when', 'where', 'why', 'how', 'all', 'both',
  'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not',
  'only', 'own', 'same', 'so', 'than', 'too', 'very', 'that', 'this', 'these',
  'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'them', 'their', 'what'
]);

/**
 * 计算例句匹配分数
 */
function calculateMatchScore(sentence: string, word: string, partOfSpeech: string): number {
  let score = 0;
  const lowerSentence = sentence.toLowerCase();
  const lowerWord = word.toLowerCase();

  // 1. 基础分：必须包含目标词 (全词匹配)
  // 使用正则确保匹配的是完整单词，而不是单词的一部分
  const wordRegex = new RegExp(`\\b${lowerWord}\\b`, 'i');
  if (!wordRegex.test(lowerSentence)) return 0;
  score += 30;

  // 2. 长度评分 (10-35词为宜)
  const wordCount = sentence.split(/\s+/).length;
  if (wordCount >= 10 && wordCount <= 35) {
    score += 20;
  } else if (wordCount < 8 || wordCount > 50) {
    score -= 20; // 太短或太长都扣分
  }

  // 3. 词性/语境匹配 (简单启发式)
  // 这是一个难点，简单的规则匹配：
  // 名词通常前面有 a/an/the/my/your/this/that 等，或者在句首，或者在动词后
  // 动词通常在主语后
  // 形容词通常在名词前或 be 动词后
  // 这里只做简单的关键词加分，不做复杂的 NLP 分析
  
  // 4. 句子结构完整性 (简单判断)
  // 包含主谓结构 (至少有一个动词? 很难判断，简单判断标点)
  if (/[.?!]$/.test(sentence.trim())) {
    score += 10;
  }

  // 5. 惩罚项：包含生僻符号或过多数字
  if ((sentence.match(/\d/g) || []).length > 4) score -= 10;
  if (/[^\x00-\x7F]/.test(sentence)) score -= 50; // 包含非ASCII字符(如中文)直接重罚，确保纯英文

  return score;
}

/**
 * 主函数
 */
async function main() {
  const args = process.argv.slice(2);
  const sourceArg = args.find(arg => arg.startsWith('--source='));
  const isTest = args.includes('--test');

  if (!sourceArg) {
    console.error('❌ 请指定数据源: --source=cet4 | cet6');
    process.exit(1);
  }

  const source = sourceArg.split('=')[1];
  const configPath = path.join(__dirname, `../configs/${source}.json`);

  if (!fs.existsSync(configPath)) {
    console.error(`❌ 配置文件不存在: ${configPath}`);
    process.exit(1);
  }

  const config: Config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

  console.log(`\n🚀 开始导入 ${config.bookName} (Step 1: 纯净导入 & 真题匹配)...\n`);

  // 1. 初始化/获取 BookTag
  let bookTag = await prisma.bookTag.findUnique({ where: { tagName: config.bookName } });
  if (!bookTag) {
    console.log(`创建词书标签: ${config.bookName}`);
    bookTag = await prisma.bookTag.create({ data: { tagName: config.bookName } });
  } else {
    console.log(`使用现有标签: ${config.bookName} (ID: ${bookTag.id})`);
  }

  // 2. 加载语料库
  const corpusPath = path.join(__dirname, `../data/${source}-corpus-clean.json`);
  if (!fs.existsSync(corpusPath)) {
    console.error(`❌ 语料库文件不存在: ${corpusPath}`);
    process.exit(1);
  }
  const corpus: CorpusItem[] = JSON.parse(fs.readFileSync(corpusPath, 'utf-8'));
  console.log(`📚 加载语料库: ${corpus.length} 个句子`);

  // 3. 加载单词数据
  const wordsData: WordData[] = JSON.parse(fs.readFileSync(config.wordSource, 'utf-8'));
  console.log(`📖 加载单词数据: ${wordsData.length} 个单词`);

  // 测试模式
  const batch = isTest ? wordsData.slice(0, 20) : wordsData;
  console.log(`${isTest ? '🧪 测试模式' : '📊 正式模式'}: 将处理 ${batch.length} 个单词\n`);

  let processedCount = 0;
  let matchedCount = 0;

  for (const item of batch) {
    processedCount++;
    if (processedCount % 100 === 0) console.log(`进度: ${processedCount}/${batch.length}`);

    // 跳过高频功能词 (不为其匹配例句，但可能需要导入单词本身? 
    // 策略：导入单词，但跳过例句匹配，或者干脆不导入? 
    // 通常词汇书里也会有 basic words，还是导入吧，只是不匹配例句)
    const isStopWord = STOPWORDS.has(item.word.toLowerCase());

    // 3.1 Upsert Word
    const word = await prisma.word.upsert({
      where: { word: item.word },
      update: {
        lemma: item.lemma || item.word,
        pronunciation: item.pronunciation || {}
      },
      create: {
        word: item.word,
        pronunciation: item.pronunciation || {},
        lemma: item.lemma || item.word
      }
    });

    // 3.2 关联 BookTag
    await prisma.wordTagRelation.upsert({
      where: {
        wordId_bookTagId: {
          wordId: word.id,
          bookTagId: bookTag.id
        }
      },
      update: {},
      create: {
        wordId: word.id,
        bookTagId: bookTag.id,
        masteryFocus: 'recognition'
      }
    });

    // 3.3 处理词义 (去重 + 过滤)
    // 内存去重
    const uniqueMeanings = new Map<string, typeof item.meanings[0]>();
    item.meanings.forEach(m => {
      // 过滤 1: 定义为空
      if (!m.definition) return;
      // 过滤 2: 纯英文定义 (视为脏数据，因为我们目标是中文释义)
      if (/^[a-zA-Z\s\.,;\(\)\-]+$/.test(m.definition)) return;
      
      // 规范化 Key: 词性 + 定义
      const key = `${m.partOfSpeech}-${m.definition.trim()}`;
      if (!uniqueMeanings.has(key)) {
        uniqueMeanings.set(key, m);
      }
    });

    for (const m of uniqueMeanings.values()) {
      // 数据库查重
      let meaning = await prisma.meaning.findFirst({
        where: {
          wordId: word.id,
          partOfSpeech: m.partOfSpeech,
          definition: m.definition
        }
      });

      if (!meaning) {
        meaning = await prisma.meaning.create({
          data: {
            wordId: word.id,
            partOfSpeech: m.partOfSpeech,
            definition: m.definition,
            extra: m.extra || {}
          }
        });
      }

      // 3.4 匹配真题例句 (仅当不是停用词时)
      if (isStopWord) continue;

      // 查找该词义是否已有例句 (避免重复添加)
      const existingRelation = await prisma.meaningExampleRelation.findFirst({
        where: { meaningId: meaning.id }
      });
      if (existingRelation) continue; // 已有例句，跳过

      // 在语料库中搜索
      // 预筛选：包含单词
      const wordRegex = new RegExp(`\\b(${item.word}|${item.lemma || item.word})\\b`, 'i');
      const candidates = corpus.filter(c => wordRegex.test(c.sentence));

      if (candidates.length === 0) continue;

      // 评分
      let bestMatch = { sentence: '', score: 0, source: '' };
      for (const candidate of candidates) {
        const score = calculateMatchScore(candidate.sentence, item.word, m.partOfSpeech);
        if (score > bestMatch.score) {
          bestMatch = { sentence: candidate.sentence, score, source: candidate.source };
        }
      }

      // 阈值判断
      if (bestMatch.score >= config.minMatchScore) {
        // 检查例句池是否已存在
        let example = await prisma.examplePool.findFirst({
          where: { sentence: bestMatch.sentence }
        });

        if (!example) {
          example = await prisma.examplePool.create({
            data: {
              sentence: bestMatch.sentence,
              sourceType: config.sourceType,
              sourceDetail: bestMatch.source
            }
          });
        }

        // 关联
        await prisma.meaningExampleRelation.create({
          data: {
            meaningId: meaning.id,
            exampleId: example.id,
            highlightWord: item.word,
            isPrimary: true
          }
        });
        
        matchedCount++;
        if (isTest) {
           console.log(`  ✅ [${item.word}] 匹配成功 (${bestMatch.score}分): ${bestMatch.sentence.substring(0, 50)}...`);
        }
      }
    }
  }

  console.log(`\n✅ 导入完成!`);
  console.log(`- 处理单词: ${processedCount}`);
  console.log(`- 匹配例句: ${matchedCount}`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
