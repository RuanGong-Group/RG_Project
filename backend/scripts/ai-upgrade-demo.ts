
import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const prisma = new PrismaClient();

const API_KEY = process.env.SILICONFLOW_API_KEY;
const API_URL = 'https://api.siliconflow.cn/v1/chat/completions'; // Adjust if needed based on provider

async function generateAIContent(word: string, pos: string, definition: string) {
  if (!API_KEY) throw new Error('SILICONFLOW_API_KEY not found');

  const prompt = `
You are an expert English teacher. I have a word for a student: "${word}" (${pos}).
Current definition: "${definition}".

Please generate a JSON object with the following fields:
1. "better_definition": A concise, easy-to-understand definition in Chinese (max 15 chars).
2. "distractors": An array of 3 strings. Each is a plausible but INCORRECT definition in Chinese (same part of speech, similar length, but wrong meaning).
3. "example": A simple English sentence using the word, with Chinese translation.

Output ONLY valid JSON.
`;

  try {
    const response = await axios.post(
      API_URL,
      {
        model: 'Qwen/Qwen2.5-7B-Instruct', // Cost-effective model
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        response_format: { type: 'json_object' }
      },
      {
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const content = response.data.choices[0].message.content;
    return JSON.parse(content);
  } catch (error) {
    console.error('AI API Error:', error);
    return null;
  }
}

async function main() {
  console.log('🚀 Starting AI Vocabulary Upgrade Demo...');

  // 1. Pick a sample word (e.g., "abandon")
  const word = await prisma.word.findFirst({
    where: { word: 'abandon' },
    include: { meanings: true }
  });

  if (!word || word.meanings.length === 0) {
    console.log('Sample word not found.');
    return;
  }

  const meaning = word.meanings[0];
  console.log(`\nTarget: ${word.word} (${meaning.partOfSpeech})`);
  console.log(`Original Def: ${meaning.definition}`);

  // 2. Generate Content
  console.log('🤖 Calling AI...');
  const aiResult = await generateAIContent(word.word, meaning.partOfSpeech, meaning.definition);

  if (aiResult) {
    console.log('\n✨ AI Improvement Result:');
    console.log('----------------------------------------');
    console.log(`Better Def:  ${aiResult.better_definition}`);
    console.log(`Distractors: ${JSON.stringify(aiResult.distractors, null, 2)}`);
    console.log(`Example:     ${aiResult.example.sentence}`);
    console.log(`Translation: ${aiResult.example.translation}`);
    console.log('----------------------------------------');

    // 3. (Simulation) How we would store it
    console.log('\n💾 Storage Plan:');
    console.log(`UPDATE Meaning SET extra = JSON_MERGE_PATCH(extra, '${JSON.stringify({ ai_optimization: aiResult })}') WHERE id = ${meaning.id};`);
  }
}

main();
