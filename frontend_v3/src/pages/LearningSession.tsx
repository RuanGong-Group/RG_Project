import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { learningApi } from '../services/api';
import type { WordToLearn } from '../types/api';

// 统一管理页面状态
type SessionStatus = 'loading' | 'error' | 'learning' | 'review_first' | 'goal_met' | 'book_completed' | 'summary';
// 定义学习结果的数据结构
type LearningResult = { meaningId: number; isCorrect: boolean };

/**
 * 辅助函数：高亮句子中的单词
 */
function HighlightedSentence({ sentence, highlight }: { sentence: string; highlight: string }) {
  if (!highlight || !sentence) {
    return <span>{sentence}</span>;
  }
  const parts = sentence.split(new RegExp(`(${highlight})`, 'gi'));
  return (
    <span>
      {parts.map((part, i) =>
        part.toLowerCase() === highlight.toLowerCase() ? (
          <span key={i} className="font-bold text-blue-600 bg-yellow-100 px-1">
            {part}
          </span>
        ) : (
          part
        )
      )}
    </span>
  );
}

export default function LearningSession() {
  const navigate = useNavigate();

  // ================= V2 状态管理 =================
  const [status, setStatus] = useState<SessionStatus>('loading');
  const [error, setError] = useState<string | null>(null);
  const [wordData, setWordData] = useState<WordToLearn | null>(null);
  const [currentMeaningIndex, setCurrentMeaningIndex] = useState(0);
  const [learningResults, setLearningResults] = useState<LearningResult[]>([]);

  // 交互状态
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [isCorrectAnswer, setIsCorrectAnswer] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // 选项状态
  const [quizOptions, setQuizOptions] = useState<string[]>([]);
  const [quizCorrectIndex, setQuizCorrectIndex] = useState<number>(0);

  // ================= V2 核心逻辑 =================

  // 1. 加载下一个单词或状态
  const loadNextWord = useCallback(async () => {
    setStatus('loading');
    setError(null);
    setWordData(null); // 重置单词数据
    try {
      const data = await learningApi.getNextWord();
      if ('code' in data) {
        // 处理特殊状态码
        setError(data.message);
        if (data.code === 'REVIEW_FIRST') setStatus('review_first');
        else if (data.code === 'GOAL_MET') setStatus('goal_met');
        else if (data.code === 'BOOK_COMPLETED') setStatus('book_completed');
      } else {
        // 成功获取单词数据
        setWordData(data);
        setCurrentMeaningIndex(0);
        setLearningResults([]);
        setSelectedOption(null);
        setShowFeedback(false);
        setStatus('learning');
      }
    } catch (err: any) {
      setError(err.message || '加载失败，请稍后重试');
      setStatus('error');
    }
  }, []);

  // 初始化加载
  useEffect(() => {
    loadNextWord();
  }, [loadNextWord]);

  // 2. 为当前词义生成选择题选项
  const generateOptions = useCallback((correctDefinition: string, allMeanings: WordToLearn['meanings']) => {
    // 从所有词义中选择干扰项，排除当前正确答案
    const distractors = allMeanings
      .map(m => m.definition)
      .filter(d => d !== correctDefinition);

    // 随机打乱干扰项并取前3个
    const shuffledDistractors = distractors.sort(() => Math.random() - 0.5).slice(0, 3);
    
    const options = [correctDefinition, ...shuffledDistractors];
    
    // 如果选项不足4个，用通用占位符补充
    const placeholders = ["近义词", "反义词", "相关词"];
    let i = 0;
    while (options.length < 4 && i < placeholders.length) {
        if (!options.includes(placeholders[i])) {
            options.push(placeholders[i]);
        }
        i++;
    }

    const shuffled = options.sort(() => Math.random() - 0.5);
    setQuizOptions(shuffled);
    setQuizCorrectIndex(shuffled.indexOf(correctDefinition));
  }, []);

  // 词义变化时，重新生成选项
  useEffect(() => {
    if (status === 'learning' && wordData && wordData.meanings[currentMeaningIndex]) {
      const currentMeaning = wordData.meanings[currentMeaningIndex];
      generateOptions(currentMeaning.definition, wordData.meanings);
    }
  }, [wordData, currentMeaningIndex, status, generateOptions]);


  // 3. 处理用户交互
  const handleSelectOption = (index: number) => {
    if (showFeedback) return;
    setSelectedOption(index);
  };

  const handleConfirmSelection = () => {
    if (selectedOption === null || !wordData) return;
    const isCorrect = selectedOption === quizCorrectIndex;
    
    // 暂存当前词义的学习结果
    const currentMeaning = wordData.meanings[currentMeaningIndex];
    const newResult: LearningResult = { meaningId: currentMeaning.meaningId, isCorrect };
    setLearningResults(prev => [...prev, newResult]);

    setIsCorrectAnswer(isCorrect);
    setShowFeedback(true);
  };

  // 4. 进入下一个词义或总结页
  const handleNext = () => {
    if (!wordData) return;

    // 检查是否还有下一个词义
    if (currentMeaningIndex < wordData.meanings.length - 1) {
      // 进入下一个词义
      setCurrentMeaningIndex(currentMeaningIndex + 1);
      setSelectedOption(null);
      setShowFeedback(false);
    } else {
      // 所有词义学完，进入总结页
      setStatus('summary');
    }
  };

  // 5. 在总结页完成单词，提交所有结果
  const handleCompleteWordAndContinue = async () => {
    if (submitting || !wordData) return;

    setSubmitting(true);
    try {
      // V2 API: 一次性提交所有结果
      await learningApi.submitProgress({ results: learningResults });
      // 成功后加载下一个单词
      await loadNextWord();
    } catch (err: any) {
      setError(err.message || '提交失败，请重试');
      // 允许用户在失败时重试
    } finally {
      setSubmitting(false);
    }
  };

  const handleBackToPlan = () => navigate('/today-plan');

  // ================= 渲染逻辑 =================

  // 状态一：加载中
  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  // 状态二：各种提示信息（错误、复习优先、目标完成等）
  if (['error', 'review_first', 'goal_met', 'book_completed'].includes(status)) {
    const titles = {
      error: '出错了',
      review_first: '温馨提示',
      goal_met: '太棒了！',
      book_completed: '恭喜！'
    };
    const icons = {
      error: '⚠️',
      review_first: '📚',
      goal_met: '🎉',
      book_completed: '🏆'
    };
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <div className="text-6xl mb-4">{icons[status as keyof typeof icons]}</div>
          <h2 className="text-2xl font-bold mb-2">{titles[status as keyof typeof titles]}</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={handleBackToPlan}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg transition-colors"
          >
            返回学习计划
          </button>
        </div>
      </div>
    );
  }
  
  // 状态三：单词总结页
  if (status === 'summary' && wordData) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">{wordData.word}</h1>
            {wordData.pronunciation && (
              <p className="text-gray-600 text-lg">
                UK: {wordData.pronunciation.uk} | US: {wordData.pronunciation.us}
              </p>
            )}
          </div>
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">学习成果</h2>
            <ul className="space-y-4">
              {wordData.meanings.map((meaning) => {
                const result = learningResults.find(r => r.meaningId === meaning.meaningId);
                const isCorrect = result ? result.isCorrect : false;
                return (
                  <li key={meaning.meaningId} className={`p-4 rounded-lg flex items-center ${isCorrect ? 'bg-green-50' : 'bg-red-50'}`}>
                    <span className={`mr-4 text-2xl ${isCorrect ? 'text-green-500' : 'text-red-500'}`}>
                      {isCorrect ? '✓' : '✗'}
                    </span>
                    <div>
                      <p className="font-semibold text-gray-800">{meaning.partOfSpeech}. {meaning.definition}</p>
                      <p className="text-sm text-gray-600 mt-1">你的选择: {isCorrect ? '正确' : '错误'}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
          <button
            onClick={handleCompleteWordAndContinue}
            disabled={submitting}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold py-4 px-6 rounded-lg transition-colors text-lg"
          >
            {submitting ? '提交中...' : '完成单词，继续学习'}
          </button>
        </div>
      </div>
    );
  }

  // 状态四：核心学习界面
  if (status === 'learning' && wordData) {
    const currentMeaning = wordData.meanings[currentMeaningIndex];
    const exampleSentence = currentMeaning.examples[0]?.sentence || '（暂无例句）';

    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-2xl mx-auto">
          {/* 顶部导航栏 */}
          <div className="flex items-center justify-start mb-6">
            <button
              onClick={() => navigate('/today-plan')}
              className="flex items-center text-gray-600 hover:text-gray-900"
            >
              <span className="mr-2">←</span>
              返回
            </button>
          </div>
          <div className="max-w-2xl w-full bg-white rounded-lg shadow-lg p-8">
          {/* 单词和音标 */}
          <div className="text-center mb-8">
            <h1 className="text-5xl font-bold text-gray-900">{wordData.word}</h1>
            {wordData.pronunciation && (
              <p className="text-gray-500 mt-2 text-lg">
                UK: {wordData.pronunciation.uk} | US: {wordData.pronunciation.us}
              </p>
            )}
          </div>

          {/* 进度条 */}
          <div className="mb-6">
            <div className="flex justify-between mb-1">
              <span className="text-sm font-medium text-blue-700">
                词义 {currentMeaningIndex + 1}/{wordData.meanings.length}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div
                className="bg-blue-600 h-2.5 rounded-full"
                style={{ width: `${((currentMeaningIndex + 1) / wordData.meanings.length) * 100}%` }}
              ></div>
            </div>
          </div>

          {/* 句子和问题 */}
          <div className="bg-gray-100 p-6 rounded-lg mb-8 text-center">
            <p className="text-xl text-gray-800 mb-4 leading-relaxed">
              <HighlightedSentence sentence={exampleSentence} highlight={wordData.word} />
            </p>
            <p className="font-semibold text-gray-700">请选择“{wordData.word}”在该句中的含义：</p>
          </div>

          {/* 选项 */}
          <div className="space-y-4 mb-8">
            {quizOptions.map((option, index) => {
              let buttonClass = 'w-full text-left p-4 rounded-lg border transition-all duration-200 ';
              if (showFeedback) {
                if (index === quizCorrectIndex) {
                  buttonClass += 'bg-green-100 border-green-500 text-green-800 font-semibold';
                } else if (index === selectedOption) {
                  buttonClass += 'bg-red-100 border-red-500 text-red-800';
                } else {
                  buttonClass += 'bg-white border-gray-300 text-gray-700 cursor-not-allowed';
                }
              } else {
                if (index === selectedOption) {
                  buttonClass += 'bg-blue-100 border-blue-500 ring-2 ring-blue-300';
                } else {
                  buttonClass += 'bg-white border-gray-300 hover:bg-gray-50';
                }
              }
              return (
                <button key={index} onClick={() => handleSelectOption(index)} disabled={showFeedback} className={buttonClass}>
                  <span className="font-mono mr-3">{String.fromCharCode(65 + index)}.</span>
                  {option}
                </button>
              );
            })}
          </div>

          {/* 操作按钮 */}
          <div className="mt-6">
            {!showFeedback ? (
              <button
                onClick={handleConfirmSelection}
                disabled={selectedOption === null}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-3 px-6 rounded-lg transition-colors"
              >
                确认选择
              </button>
            ) : (
              <button
                onClick={handleNext}
                className={`w-full text-white font-medium py-3 px-6 rounded-lg transition-colors ${isCorrectAnswer ? 'bg-green-600 hover:bg-green-700' : 'bg-yellow-500 hover:bg-yellow-600'}`}
              >
                {currentMeaningIndex < wordData.meanings.length - 1 ? '下一个词义' : '查看单词总结'}
              </button>
            )}
          </div>
        </div>
        </div>
      </div>
    );
  }

  // 状态五：回退或空状态
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="text-center">
        <p className="text-gray-600">未知状态，请返回重试。</p>
        <button
          onClick={handleBackToPlan}
          className="mt-4 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg"
        >
          返回学习计划
        </button>
      </div>
    </div>
  );
}