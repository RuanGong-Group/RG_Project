/**
 * 词书数据导入脚本
 * 用途：从JSON文件导入词书数据到中央词库
 * 创建日期：2025年10月30日
 * 
 * 使用方法：
 * npm run import-wordbook -- --book "大学英语四级核心词汇" --file ./data/cet4-sample.json
 * 
 * 参数说明：
 * --book   词书名称（必填）
 * --file   JSON数据文件路径（必填）
 * --dry-run 试运行模式，不实际写入数据库（可选）
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

// ============================================
// 类型定义
// ============================================

/** 音标对象 */
interface Phonetic {
  uk?: string;
  us?: string;
}

/** 词义对象 */
interface MeaningData {
  definition: string;
  difficulty?: number;
  examples?: string[];
}

/** 词性对象 */
interface PartOfSpeechData {
  pos: string;
  meanings: MeaningData[];
}

/** 单词条目 */
interface WordEntry {
  word: string;
  phonetic?: Phonetic;
  partsOfSpeech: PartOfSpeechData[];
}

/** 命令行参数 */
interface ImportOptions {
  book: string;
  file: string;
  dryRun: boolean;
}

/** 错误详情 */
interface ErrorDetail {
  word: string;
  layer: string;  // 'word' | 'pos' | 'meaning' | 'example' | 'relation'
  message: string;
  timestamp: Date;
}

/** 导入统计 */
interface ImportStats {
  totalWords: number;
  newWords: number;
  existingWords: number;
  reusedWords: number;
  newPartOfSpeech: number;
  reusedPartOfSpeech: number;
  newMeanings: number;
  reusedMeanings: number;
  newExamples: number;
  reusedExamples: number;
  newMeaningExampleRelations: number;
  reusedMeaningExampleRelations: number;
  newWordTagRelations: number;
  reusedWordTagRelations: number;
  skippedWords: number;
  errors: string[];
  errorDetails: ErrorDetail[];
}

// ============================================
// 工具函数
// ============================================

/**
 * 解析命令行参数
 */
function parseArguments(): ImportOptions | null {
  const args = process.argv.slice(2);
  const options: Partial<ImportOptions> = {
    dryRun: false
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--book' && i + 1 < args.length) {
      options.book = args[++i];
    } else if (arg === '--file' && i + 1 < args.length) {
      options.file = args[++i];
    } else if (arg === '--dry-run') {
      options.dryRun = true;
    }
  }

  // 验证必填参数
  if (!options.book || !options.file) {
    console.error('❌ 错误：缺少必填参数');
    console.error('\n使用方法：');
    console.error('  npm run import-wordbook -- --book "词书名称" --file ./data/cet4.json');
    console.error('\n参数说明：');
    console.error('  --book      词书名称（必填）');
    console.error('  --file      JSON数据文件路径（必填）');
    console.error('  --dry-run   试运行模式，不实际写入数据库（可选）');
    return null;
  }

  return options as ImportOptions;
}

/**
 * 读取并解析JSON文件
 */
function readJsonFile(filePath: string): WordEntry[] | null {
  try {
    // 解析文件路径
    const absolutePath = path.isAbsolute(filePath) 
      ? filePath 
      : path.resolve(process.cwd(), filePath);

    console.log(`📂 读取文件: ${absolutePath}`);

    // 检查文件是否存在
    if (!fs.existsSync(absolutePath)) {
      console.error(`❌ 错误：文件不存在 - ${absolutePath}`);
      return null;
    }

    // 读取文件内容
    const fileContent = fs.readFileSync(absolutePath, 'utf-8');
    
    // 解析JSON
    const data = JSON.parse(fileContent);

    // 验证数据格式
    if (!Array.isArray(data)) {
      console.error('❌ 错误：JSON文件必须是数组格式');
      return null;
    }

    if (data.length === 0) {
      console.error('❌ 错误：JSON文件为空');
      return null;
    }

    console.log(`✅ 成功读取 ${data.length} 个单词条目`);
    return data;

  } catch (error) {
    if (error instanceof SyntaxError) {
      console.error('❌ 错误：JSON格式无效');
      console.error(`   ${error.message}`);
    } else {
      console.error('❌ 读取文件失败:', error);
    }
    return null;
  }
}

/**
 * 验证单词条目数据格式
 */
function validateWordEntry(entry: any, index: number): boolean {
  const errors: string[] = [];

  // 验证 word 字段
  if (!entry.word || typeof entry.word !== 'string') {
    errors.push('缺少或无效的 word 字段');
  }

  // 验证 partsOfSpeech 字段
  if (!Array.isArray(entry.partsOfSpeech) || entry.partsOfSpeech.length === 0) {
    errors.push('缺少或无效的 partsOfSpeech 字段（必须是非空数组）');
  } else {
    // 验证每个词性
    entry.partsOfSpeech.forEach((pos: any, posIndex: number) => {
      if (!pos.pos || typeof pos.pos !== 'string') {
        errors.push(`词性[${posIndex}]缺少或无效的 pos 字段`);
      }
      if (!Array.isArray(pos.meanings) || pos.meanings.length === 0) {
        errors.push(`词性[${posIndex}]缺少或无效的 meanings 字段（必须是非空数组）`);
      } else {
        // 验证每个词义
        pos.meanings.forEach((meaning: any, meaningIndex: number) => {
          if (!meaning.definition || typeof meaning.definition !== 'string') {
            errors.push(`词性[${posIndex}]词义[${meaningIndex}]缺少或无效的 definition 字段`);
          }
        });
      }
    });
  }

  if (errors.length > 0) {
    console.error(`❌ 单词条目[${index}] "${entry.word || '未知'}" 验证失败:`);
    errors.forEach(err => console.error(`   - ${err}`));
    return false;
  }

  return true;
}

/**
 * 初始化导入统计
 */
function createStats(): ImportStats {
  return {
    totalWords: 0,
    newWords: 0,
    existingWords: 0,
    reusedWords: 0,
    newPartOfSpeech: 0,
    reusedPartOfSpeech: 0,
    newMeanings: 0,
    reusedMeanings: 0,
    newExamples: 0,
    reusedExamples: 0,
    newMeaningExampleRelations: 0,
    reusedMeaningExampleRelations: 0,
    newWordTagRelations: 0,
    reusedWordTagRelations: 0,
    skippedWords: 0,
    errors: [],
    errorDetails: []
  };
}

/**
 * 格式化音标为JSON字符串
 * 注意：此函数将在任务5-8的实际导入逻辑中使用
 */
function formatPhonetic(phonetic?: Phonetic): string {
  const defaultPhonetic = { uk: '', us: '' };
  const phoneticData = phonetic || defaultPhonetic;
  return JSON.stringify({
    uk: phoneticData.uk || '',
    us: phoneticData.us || ''
  });
}

// 避免 TS6133 错误 - 函数将在后续任务中使用
if (false) { formatPhonetic(); }

/**
 * 打印导入统计
 */
function printStats(stats: ImportStats, startTime: number) {
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  
  console.log('\n' + '='.repeat(70));
  console.log('📊 导入统计报告');
  console.log('='.repeat(70));
  console.log(`⏱️  总耗时: ${duration} 秒`);
  console.log(`📝 处理单词: ${stats.totalWords} 个`);
  
  // 数据层统计
  console.log('\n📈 数据层统计:');
  console.log('─'.repeat(70));
  
  // 单词层
  const wordTotal = stats.newWords + stats.reusedWords;
  console.log(`  📝 单词 (Word)         : 新增 ${stats.newWords.toString().padStart(3, ' ')} | 复用 ${stats.reusedWords.toString().padStart(3, ' ')} | 共 ${wordTotal.toString().padStart(3, ' ')}`);
  
  // 词性层
  const posTotal = stats.newPartOfSpeech + stats.reusedPartOfSpeech;
  console.log(`  📌 词性 (PartOfSpeech) : 新增 ${stats.newPartOfSpeech.toString().padStart(3, ' ')} | 复用 ${stats.reusedPartOfSpeech.toString().padStart(3, ' ')} | 共 ${posTotal.toString().padStart(3, ' ')}`);
  
  // 词义层
  const meaningTotal = stats.newMeanings + stats.reusedMeanings;
  console.log(`  💡 词义 (Meaning)      : 新增 ${stats.newMeanings.toString().padStart(3, ' ')} | 复用 ${stats.reusedMeanings.toString().padStart(3, ' ')} | 共 ${meaningTotal.toString().padStart(3, ' ')}`);
  
  // 例句层
  const exampleTotal = stats.newExamples + stats.reusedExamples;
  console.log(`  📚 例句 (ExamplePool)  : 新增 ${stats.newExamples.toString().padStart(3, ' ')} | 复用 ${stats.reusedExamples.toString().padStart(3, ' ')} | 共 ${exampleTotal.toString().padStart(3, ' ')}`);
  
  // 关联统计
  console.log('\n🔗 关联关系统计:');
  console.log('─'.repeat(70));
  
  const meRelTotal = stats.newMeaningExampleRelations + stats.reusedMeaningExampleRelations;
  console.log(`  词义↔例句             : 新增 ${stats.newMeaningExampleRelations.toString().padStart(3, ' ')} | 复用 ${stats.reusedMeaningExampleRelations.toString().padStart(3, ' ')} | 共 ${meRelTotal.toString().padStart(3, ' ')}`);
  
  const wtRelTotal = stats.newWordTagRelations + stats.reusedWordTagRelations;
  console.log(`  单词↔标签             : 新增 ${stats.newWordTagRelations.toString().padStart(3, ' ')} | 复用 ${stats.reusedWordTagRelations.toString().padStart(3, ' ')} | 共 ${wtRelTotal.toString().padStart(3, ' ')}`);
  
  // 数据复用率
  if (wordTotal > 0) {
    console.log('\n♻️  数据复用率:');
    console.log('─'.repeat(70));
    const wordReuseRate = ((stats.reusedWords / wordTotal) * 100).toFixed(1);
    const posReuseRate = posTotal > 0 ? ((stats.reusedPartOfSpeech / posTotal) * 100).toFixed(1) : '0.0';
    const meaningReuseRate = meaningTotal > 0 ? ((stats.reusedMeanings / meaningTotal) * 100).toFixed(1) : '0.0';
    const exampleReuseRate = exampleTotal > 0 ? ((stats.reusedExamples / exampleTotal) * 100).toFixed(1) : '0.0';
    
    console.log(`  单词: ${wordReuseRate}% | 词性: ${posReuseRate}% | 词义: ${meaningReuseRate}% | 例句: ${exampleReuseRate}%`);
  }
  
  // 警告和错误
  if (stats.skippedWords > 0 || stats.errors.length > 0 || stats.errorDetails.length > 0) {
    console.log('\n⚠️  警告和错误:');
    console.log('─'.repeat(70));
    
    if (stats.skippedWords > 0) {
      console.log(`  ⚠️  跳过的单词: ${stats.skippedWords} 个`);
    }
    
    if (stats.errors.length > 0) {
      console.log(`  ❌ 错误记录: ${stats.errors.length} 条`);
      stats.errors.slice(0, 5).forEach((err, i) => {
        console.log(`     ${i + 1}. ${err}`);
      });
      if (stats.errors.length > 5) {
        console.log(`     ... 还有 ${stats.errors.length - 5} 个错误`);
      }
    }
    
    if (stats.errorDetails.length > 0) {
      console.log(`\n  💾 详细错误日志已保存到: import-errors.log`);
    }
  }
  
  console.log('='.repeat(70));
}

/**
 * 记录错误（同时记录简单消息和详细信息）
 */
function recordError(stats: ImportStats, word: string, layer: string, message: string) {
  stats.errors.push(`[${layer}] ${word}: ${message}`);
  stats.errorDetails.push({
    word,
    layer,
    message,
    timestamp: new Date()
  });
}

// 避免 TS6133 错误 - 函数为后续优化预留
if (false) { recordError(createStats(), '', '', ''); }

/**
 * 保存错误日志到文件
 */
function saveErrorLog(stats: ImportStats, bookName: string) {
  if (stats.errorDetails.length === 0) {
    return;
  }
  
  try {
    const logPath = path.resolve('./import-errors.log');
    
    let logContent = `\n${'='.repeat(80)}\n`;
    logContent += `导入错误日志 - ${bookName}\n`;
    logContent += `时间: ${new Date().toLocaleString('zh-CN')}\n`;
    logContent += `总错误数: ${stats.errorDetails.length}\n`;
    logContent += `${'='.repeat(80)}\n\n`;
    
    // 按单词分组显示错误
    const errorsByWord = new Map<string, ErrorDetail[]>();
    stats.errorDetails.forEach(error => {
      if (!errorsByWord.has(error.word)) {
        errorsByWord.set(error.word, []);
      }
      errorsByWord.get(error.word)!.push(error);
    });
    
    errorsByWord.forEach((errors, word) => {
      logContent += `单词: ${word}\n`;
      logContent += `${'─'.repeat(80)}\n`;
      errors.forEach((error, idx) => {
        logContent += `  ${idx + 1}. [${error.layer}] ${error.message}\n`;
        logContent += `     时间: ${error.timestamp.toLocaleString('zh-CN')}\n`;
      });
      logContent += '\n';
    });
    
    // 追加到日志文件
    fs.appendFileSync(logPath, logContent, 'utf-8');
    
  } catch (error) {
    console.error('保存错误日志失败:', error);
  }
}

// ============================================
// 数据导入逻辑 - 分层处理
// ============================================

/**
 * 导入单词层数据
 * 功能：查重、创建Word记录、返回word到ID的映射
 * @param wordEntries 待导入的单词条目
 * @param bookTagId 词书标签ID（将在任务9中用于建立关联）
 * @param stats 统计对象
 */
async function importWords(
  wordEntries: WordEntry[],
  bookTagId: number, // 将在任务9中使用
  stats: ImportStats
): Promise<Map<string, number>> {
  console.log('   📝 处理单词层（Word表）...');
  
  // 避免 TS6133 - bookTagId 将在任务9中使用
  void bookTagId;
  
  // 用于存储 单词 -> wordId 的映射
  const wordIdMap = new Map<string, number>();
  
  // 1. 预加载数据库中已存在的所有单词（优化性能）
  const existingWords = await prisma.word.findMany({
    select: { id: true, word: true }
  });
  
  const existingWordMap = new Map<string, number>();
  existingWords.forEach(w => {
    existingWordMap.set(w.word.toLowerCase(), w.id);
  });
  
  console.log(`   ℹ️  数据库中已有 ${existingWords.length} 个单词`);
  
  // 2. 遍历待导入的单词
  let processedCount = 0;
  for (const entry of wordEntries) {
    try {
      const wordLower = entry.word.toLowerCase();
      
      // 检查是否已存在
      let wordId = existingWordMap.get(wordLower);
      
      if (wordId) {
        // 单词已存在，直接使用
        stats.existingWords++;
        stats.reusedWords++;
        wordIdMap.set(entry.word, wordId);
      } else {
        // 单词不存在，创建新记录
        const phoneticJson = formatPhonetic(entry.phonetic);
        
        const newWord = await prisma.word.create({
          data: {
            word: entry.word.toLowerCase(),
            pronunciation: phoneticJson
          }
        });
        
        wordId = newWord.id;
        stats.newWords++;
        
        // 更新映射（避免重复创建）
        existingWordMap.set(wordLower, wordId);
        wordIdMap.set(entry.word, wordId);
      }
      
      processedCount++;
      
      // 每处理10个单词显示一次进度
      if (processedCount % 10 === 0 || processedCount === wordEntries.length) {
        console.log(`   进度: ${processedCount}/${wordEntries.length} 单词`);
      }
      
    } catch (error) {
      console.error(`   ❌ 处理单词 "${entry.word}" 失败:`, error);
      stats.errors.push(`单词 "${entry.word}" 导入失败: ${error}`);
    }
  }
  
  console.log(`   ✅ 单词层处理完成！新增: ${stats.newWords}, 复用: ${stats.existingWords}\n`);
  
  return wordIdMap;
}

/**
 * 导入词性层数据
 * 功能：为每个单词创建词性记录，查重逻辑基于 wordId + partOfSpeech
 * @param wordEntries 待导入的单词条目
 * @param wordIdMap 单词到ID的映射
 * @param stats 统计对象
 * @returns Map<string, number[]> - 单词+词性 到 partOfSpeechId 的映射
 */
async function importPartsOfSpeech(
  wordEntries: WordEntry[],
  wordIdMap: Map<string, number>,
  stats: ImportStats
): Promise<Map<string, number>> {
  console.log('   📝 处理词性层（PartOfSpeech表）...');
  
  // 用于存储 "word:pos" -> partOfSpeechId 的映射
  const posIdMap = new Map<string, number>();
  
  // 1. 预加载数据库中已存在的所有词性（优化性能）
  const existingPos = await prisma.partOfSpeech.findMany({
    select: { 
      id: true, 
      wordId: true, 
      partOfSpeech: true 
    }
  });
  
  // 建立 "wordId:pos" -> posId 的映射
  const existingPosMap = new Map<string, number>();
  existingPos.forEach(pos => {
    const key = `${pos.wordId}:${pos.partOfSpeech}`;
    existingPosMap.set(key, pos.id);
  });
  
  console.log(`   ℹ️  数据库中已有 ${existingPos.length} 个词性记录`);
  
  // 2. 遍历所有单词条目，处理其词性
  let processedCount = 0;
  let totalPosCount = 0;
  
  for (const entry of wordEntries) {
    try {
      const wordId = wordIdMap.get(entry.word);
      
      if (!wordId) {
        stats.errors.push(`词性处理：单词 "${entry.word}" 未找到对应的wordId`);
        continue;
      }
      
      // 处理该单词的所有词性
      for (const posData of entry.partsOfSpeech) {
        totalPosCount++;
        const posKey = `${wordId}:${posData.pos}`;
        
        // 检查是否已存在（word_id + part_of_speech 组合查重）
        let posId = existingPosMap.get(posKey);
        
        if (posId) {
          // 词性已存在，直接使用
          stats.reusedPartOfSpeech++;
          posIdMap.set(`${entry.word}:${posData.pos}`, posId);
        } else {
          // 词性不存在，创建新记录
          const newPos = await prisma.partOfSpeech.create({
            data: {
              wordId: wordId,
              partOfSpeech: posData.pos
            }
          });
          
          posId = newPos.id;
          stats.newPartOfSpeech++;
          
          // 更新映射（避免重复创建）
          existingPosMap.set(posKey, posId);
          posIdMap.set(`${entry.word}:${posData.pos}`, posId);
        }
      }
      
      processedCount++;
      
      // 每处理10个单词显示一次进度
      if (processedCount % 10 === 0 || processedCount === wordEntries.length) {
        console.log(`   进度: ${processedCount}/${wordEntries.length} 单词 (共${totalPosCount}个词性)`);
      }
      
    } catch (error) {
      console.error(`   ❌ 处理单词 "${entry.word}" 的词性失败:`, error);
      stats.errors.push(`词性处理：单词 "${entry.word}" 失败: ${error}`);
    }
  }
  
  const existingPosCount = totalPosCount - stats.newPartOfSpeech;
  console.log(`   ✅ 词性层处理完成！新增: ${stats.newPartOfSpeech}, 复用: ${existingPosCount}\n`);
  
  return posIdMap;
}

/**
 * 导入词义层数据
 * 功能：为每个词性创建词义记录，查重逻辑基于 partOfSpeechId + definition（归一化比较）
 * @param wordEntries 待导入的单词条目
 * @param posIdMap 单词+词性 到 partOfSpeechId 的映射
 * @param stats 统计对象
 * @returns Map<string, number> - "word:pos:definition" 到 meaningId 的映射
 */
async function importMeanings(
  wordEntries: WordEntry[],
  posIdMap: Map<string, number>,
  stats: ImportStats
): Promise<Map<string, number>> {
  console.log('   📝 处理词义层（Meaning表）...');
  
  // 用于存储 "word:pos:definition" -> meaningId 的映射
  const meaningIdMap = new Map<string, number>();
  
  // 1. 预加载数据库中已存在的所有词义（优化性能）
  const existingMeanings = await prisma.meaning.findMany({
    select: { 
      id: true, 
      partOfSpeechId: true, 
      definition: true 
    }
  });
  
  // 建立 "posId:normalizedDef" -> meaningId 的映射
  // 归一化：去除空格、标点，转小写
  const existingMeaningMap = new Map<string, number>();
  existingMeanings.forEach(meaning => {
    const normalizedDef = normalizeDefinition(meaning.definition);
    const key = `${meaning.partOfSpeechId}:${normalizedDef}`;
    existingMeaningMap.set(key, meaning.id);
  });
  
  console.log(`   ℹ️  数据库中已有 ${existingMeanings.length} 个词义记录`);
  
  // 2. 遍历所有单词条目，处理其词义
  let processedCount = 0;
  let totalMeaningCount = 0;
  
  for (const entry of wordEntries) {
    try {
      // 处理该单词的所有词性
      for (const posData of entry.partsOfSpeech) {
        const posKey = `${entry.word}:${posData.pos}`;
        const posId = posIdMap.get(posKey);
        
        if (!posId) {
          stats.errors.push(`词义处理：单词 "${entry.word}" 词性 "${posData.pos}" 未找到对应的posId`);
          continue;
        }
        
        // 处理该词性下的所有词义
        for (const meaningData of posData.meanings) {
          totalMeaningCount++;
          const normalizedDef = normalizeDefinition(meaningData.definition);
          const checkKey = `${posId}:${normalizedDef}`;
          
          // 检查是否已存在（partOfSpeechId + 归一化的definition 查重）
          let meaningId = existingMeaningMap.get(checkKey);
          
          if (meaningId) {
            // 词义已存在，直接使用
            stats.reusedMeanings++;
            meaningIdMap.set(`${entry.word}:${posData.pos}:${meaningData.definition}`, meaningId);
          } else {
            // 词义不存在，创建新记录
            // 保存难度信息到 relatedInfo（JSON格式）
            const relatedInfo = meaningData.difficulty 
              ? JSON.stringify({ difficulty: meaningData.difficulty })
              : null;
            
            const newMeaning = await prisma.meaning.create({
              data: {
                partOfSpeechId: posId,
                definition: meaningData.definition,
                relatedInfo: relatedInfo
              }
            });
            
            meaningId = newMeaning.id;
            stats.newMeanings++;
            
            // 更新映射（避免重复创建）
            existingMeaningMap.set(checkKey, meaningId);
            meaningIdMap.set(`${entry.word}:${posData.pos}:${meaningData.definition}`, meaningId);
          }
        }
      }
      
      processedCount++;
      
      // 每处理10个单词显示一次进度
      if (processedCount % 10 === 0 || processedCount === wordEntries.length) {
        console.log(`   进度: ${processedCount}/${wordEntries.length} 单词 (共${totalMeaningCount}个词义)`);
      }
      
    } catch (error) {
      console.error(`   ❌ 处理单词 "${entry.word}" 的词义失败:`, error);
      stats.errors.push(`词义处理：单词 "${entry.word}" 失败: ${error}`);
    }
  }
  
  const existingMeaningCount = totalMeaningCount - stats.newMeanings;
  console.log(`   ✅ 词义层处理完成！新增: ${stats.newMeanings}, 复用: ${existingMeaningCount}\n`);
  
  return meaningIdMap;
}

/**
 * 归一化定义文本，用于查重比较
 * 规则：去除空格、标点符号，转小写
 */
function normalizeDefinition(definition: string): string {
  return definition
    .toLowerCase()
    .replace(/[\s\-；;、，,。.！!？?]/g, '')
    .trim();
}

/**
 * 导入例句池数据
 * 功能：为每个词义创建例句记录，查重逻辑基于 sentence 字段
 * @param wordEntries 待导入的单词条目
 * @param meaningIdMap "word:pos:definition" 到 meaningId 的映射
 * @param stats 统计对象
 */
async function importExamples(
  wordEntries: WordEntry[],
  meaningIdMap: Map<string, number>,
  stats: ImportStats
): Promise<void> {
  console.log('   📝 处理例句池（ExamplePool和MeaningExampleRelation表）...');
  
  // 1. 预加载数据库中已存在的所有例句（优化性能）
  const existingExamples = await prisma.examplePool.findMany({
    select: { 
      id: true, 
      sentence: true 
    }
  });
  
  // 建立 sentence -> exampleId 的映射（用于查重）
  const existingExampleMap = new Map<string, number>();
  existingExamples.forEach(example => {
    existingExampleMap.set(example.sentence, example.id);
  });
  
  console.log(`   ℹ️  数据库中已有 ${existingExamples.length} 个例句记录`);
  
  // 2. 预加载已存在的关联关系（优化性能，避免重复创建关联）
  const existingRelations = await prisma.meaningExampleRelation.findMany({
    select: {
      meaningId: true,
      exampleId: true
    }
  });
  
  const existingRelationSet = new Set<string>();
  existingRelations.forEach(rel => {
    existingRelationSet.add(`${rel.meaningId}:${rel.exampleId}`);
  });
  
  console.log(`   ℹ️  数据库中已有 ${existingRelations.length} 个词义-例句关联`);
  
  // 3. 遍历所有单词条目，处理其例句
  let processedCount = 0;
  let totalExampleCount = 0;
  let newExampleCount = 0;
  let reusedExampleCount = 0;
  let newRelationCount = 0;
  let reusedRelationCount = 0;
  
  for (const entry of wordEntries) {
    try {
      // 处理该单词的所有词性
      for (const posData of entry.partsOfSpeech) {
        // 处理该词性下的所有词义
        for (const meaningData of posData.meanings) {
          const meaningKey = `${entry.word}:${posData.pos}:${meaningData.definition}`;
          const meaningId = meaningIdMap.get(meaningKey);
          
          if (!meaningId) {
            stats.errors.push(`例句处理：单词 "${entry.word}" 词义 "${meaningData.definition}" 未找到对应的meaningId`);
            continue;
          }
          
          // 处理该词义下的所有例句
          if (meaningData.examples && meaningData.examples.length > 0) {
            for (let order = 0; order < meaningData.examples.length; order++) {
              const sentenceText = meaningData.examples[order];
              totalExampleCount++;
              
              // 检查例句是否已存在（sentence字段查重）
              let exampleId = existingExampleMap.get(sentenceText);
              
              if (!exampleId) {
                // 例句不存在，创建新记录
                // 从词义的difficulty推断例句难度（如果有的话）
                const difficulty = meaningData.difficulty 
                  ? getDifficultyLabel(meaningData.difficulty)
                  : 'CET4';
                
                const newExample = await prisma.examplePool.create({
                  data: {
                    sentence: sentenceText,
                    source: '导入数据',  // 可以根据实际情况调整
                    difficulty: difficulty
                  }
                });
                
                exampleId = newExample.id;
                newExampleCount++;
                stats.newExamples++;
                
                // 更新映射（避免重复创建）
                existingExampleMap.set(sentenceText, exampleId);
              } else {
                reusedExampleCount++;
                stats.reusedExamples++;
              }
              
              // 创建词义-例句关联（如果不存在）
              const relationKey = `${meaningId}:${exampleId}`;
              if (!existingRelationSet.has(relationKey)) {
                // 提取高亮词（当前单词）
                await prisma.meaningExampleRelation.create({
                  data: {
                    meaningId: meaningId,
                    exampleId: exampleId,
                    highlightWord: entry.word,
                    orderInMeaning: order + 1  // 1-based index
                  }
                });
                
                newRelationCount++;
                stats.newMeaningExampleRelations++;
                
                // 更新集合（避免重复创建）
                existingRelationSet.add(relationKey);
              } else {
                reusedRelationCount++;
                stats.reusedMeaningExampleRelations++;
              }
            }
          }
        }
      }
      
      processedCount++;
      
      // 每处理10个单词显示一次进度
      if (processedCount % 10 === 0 || processedCount === wordEntries.length) {
        console.log(`   进度: ${processedCount}/${wordEntries.length} 单词 (共${totalExampleCount}个例句)`);
      }
      
    } catch (error) {
      console.error(`   ❌ 处理单词 "${entry.word}" 的例句失败:`, error);
      stats.errors.push(`例句处理：单词 "${entry.word}" 失败: ${error}`);
    }
  }
  
  console.log(`   ✅ 例句池处理完成！`);
  console.log(`      例句: 新增${newExampleCount}, 复用${reusedExampleCount}`);
  console.log(`      关联: 新增${newRelationCount}, 复用${reusedRelationCount}\n`);
}

/**
 * 将数字难度转换为难度标签
 */
function getDifficultyLabel(difficulty: number): string {
  const difficultyMap: Record<number, string> = {
    1: '小学',
    2: 'CET4',
    3: 'CET6',
    4: '考研',
    5: '专业'
  };
  return difficultyMap[difficulty] || 'CET4';
}

/**
 * 导入单词-标签关联
 * 功能：为每个单词创建与词书标签的关联关系
 * @param wordEntries 待导入的单词条目
 * @param wordIdMap 单词到ID的映射
 * @param bookTagId 词书标签ID
 * @param stats 统计对象
 */
async function importWordTagRelations(
  wordEntries: WordEntry[],
  wordIdMap: Map<string, number>,
  bookTagId: number,
  stats: ImportStats
): Promise<void> {
  console.log('   📝 处理单词-标签关联（WordTagRelation表）...');
  
  // 1. 预加载数据库中已存在的所有关联（优化性能）
  const existingRelations = await prisma.wordTagRelation.findMany({
    select: {
      wordId: true,
      bookTagId: true
    }
  });
  
  // 建立 "wordId:bookTagId" -> 存在标记 的集合
  const existingRelationSet = new Set<string>();
  existingRelations.forEach(rel => {
    existingRelationSet.add(`${rel.wordId}:${rel.bookTagId}`);
  });
  
  console.log(`   ℹ️  数据库中已有 ${existingRelations.length} 个单词-标签关联`);
  
  // 2. 遍历所有单词条目，创建关联
  let newRelationCount = 0;
  let reusedRelationCount = 0;
  
  for (const entry of wordEntries) {
    try {
      const wordId = wordIdMap.get(entry.word);
      
      if (!wordId) {
        stats.errors.push(`标签关联：单词 "${entry.word}" 未找到对应的wordId`);
        continue;
      }
      
      // 检查关联是否已存在
      const relationKey = `${wordId}:${bookTagId}`;
      
      if (existingRelationSet.has(relationKey)) {
        // 关联已存在，跳过
        reusedRelationCount++;
        stats.reusedWordTagRelations++;
      } else {
        // 关联不存在，创建新记录
        // masteryFocus默认为'recognition'（识记），高频词可以设为'production'（产出）
        await prisma.wordTagRelation.create({
          data: {
            wordId: wordId,
            bookTagId: bookTagId,
            masteryFocus: 'recognition'  // 默认识记模式
          }
        });
        
        newRelationCount++;
        stats.newWordTagRelations++;
        
        // 更新集合（避免重复创建）
        existingRelationSet.add(relationKey);
      }
      
    } catch (error) {
      console.error(`   ❌ 处理单词 "${entry.word}" 的标签关联失败:`, error);
      stats.errors.push(`标签关联：单词 "${entry.word}" 失败: ${error}`);
    }
  }
  
  console.log(`   ✅ 单词-标签关联处理完成！新增: ${newRelationCount}, 复用: ${reusedRelationCount}\n`);
}

// 避免 TS6133 错误 - 函数将在后续任务中使用
if (false) { normalizeDefinition(''); getDifficultyLabel(1); }

// ============================================
// 主导入逻辑
// ============================================

/**
 * 执行导入
 */
async function importWordbook(options: ImportOptions) {
  const startTime = Date.now();
  const stats = createStats();

  try {
    console.log('\n' + '='.repeat(60));
    console.log('🚀 开始导入词书数据');
    console.log('='.repeat(60));
    console.log(`📖 词书名称: ${options.book}`);
    console.log(`📄 数据文件: ${options.file}`);
    if (options.dryRun) {
      console.log('🔍 模式: 试运行（不写入数据库）');
    }
    console.log('='.repeat(60) + '\n');

    // 1. 读取JSON文件
    const wordEntries = readJsonFile(options.file);
    if (!wordEntries) {
      throw new Error('读取数据文件失败');
    }

    stats.totalWords = wordEntries.length;

    // 2. 验证数据格式
    console.log('🔍 验证数据格式...');
    let validEntries = 0;
    for (let i = 0; i < wordEntries.length; i++) {
      if (validateWordEntry(wordEntries[i], i)) {
        validEntries++;
      } else {
        stats.skippedWords++;
        stats.errors.push(`单词条目[${i}] "${wordEntries[i]?.word || '未知'}" 格式验证失败`);
      }
    }
    console.log(`✅ 验证完成: ${validEntries}/${wordEntries.length} 条目有效\n`);

    if (validEntries === 0) {
      throw new Error('没有有效的数据条目');
    }

    // 3. 如果是试运行模式，到此结束
    if (options.dryRun) {
      console.log('✅ 试运行完成！数据格式验证通过。');
      console.log('💡 移除 --dry-run 参数以执行实际导入。\n');
      printStats(stats, startTime);
      return;
    }

    // 4. 创建或获取词书标签
    console.log('📚 Step 1: 创建/获取词书标签...');
    let bookTag = await prisma.bookTag.findUnique({
      where: { tagName: options.book }
    });

    if (bookTag) {
      console.log(`   ✅ 词书已存在: ${bookTag.tagName} (ID: ${bookTag.id})`);
    } else {
      bookTag = await prisma.bookTag.create({
        data: {
          tagName: options.book,
          isUserDefined: false
        }
      });
      console.log(`   ✅ 词书创建成功: ${bookTag.tagName} (ID: ${bookTag.id})`);
    }

    console.log('\n📝 Step 2: 导入单词数据...');
    console.log('   (这可能需要一些时间，请耐心等待...)\n');

    // 5. 导入单词（Word层）
    const wordIdMap = await importWords(wordEntries, bookTag.id, stats);

    // 6. 导入词性（PartOfSpeech层）
    const posIdMap = await importPartsOfSpeech(wordEntries, wordIdMap, stats);

    // 7. 导入词义（Meaning层）
    const meaningIdMap = await importMeanings(wordEntries, posIdMap, stats);

    // 8. 导入例句池（ExamplePool层 + MeaningExampleRelation关联）
    await importExamples(wordEntries, meaningIdMap, stats);

    // 9. 导入单词-标签关联（WordTagRelation）
    await importWordTagRelations(wordEntries, wordIdMap, bookTag.id, stats);

    // 打印统计
    printStats(stats, startTime);
    
    // 保存错误日志（如果有错误）
    if (stats.errorDetails.length > 0) {
      saveErrorLog(stats, options.book);
    }

    console.log('\n✅ 导入流程完成！所有数据层已成功导入！');
    console.log('� 数据结构: Word → PartOfSpeech → Meaning → Example');
    console.log('🏷️  标签关联: Word ↔ BookTag\n');

  } catch (error) {
    console.error('\n❌ 导入失败:', error);
    const errorMsg = error instanceof Error ? error.message : String(error);
    stats.errors.push(errorMsg);
    stats.errorDetails.push({
      word: '系统',
      layer: 'system',
      message: errorMsg,
      timestamp: new Date()
    });
    printStats(stats, startTime);
    saveErrorLog(stats, options.book);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// ============================================
// 脚本入口
// ============================================

async function main() {
  console.log('\n📦 词书数据导入工具 v1.0\n');

  // 解析命令行参数
  const options = parseArguments();
  if (!options) {
    process.exit(1);
    return; // TypeScript 需要 return 来确保后续代码不会执行
  }

  // 执行导入
  try {
    await importWordbook(options);
    process.exit(0);
  } catch (error) {
    console.error('\n💥 脚本执行失败\n');
    process.exit(1);
  }
}

// 运行主函数
main();
