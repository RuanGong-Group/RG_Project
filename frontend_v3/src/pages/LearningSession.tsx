/**
 * 学习会话页面 - 选择题模式
 * TODO: 后续需要后端实现智能干扰项生成
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { learningApi } from '../services/api';
import type { NextWordResponse } from '../types/api';

/**
 * 辅助函数：不区分大小写地高亮句子中的单词
 */
function splitSentenceWithHighlight(sentence: string, highlightWord: string): {
  parts: string[];
  actualWords: string[];
} {
  if (!highlightWord) {
    return { parts: [sentence], actualWords: [] };
  }

  const regex = new RegExp(`(${highlightWord})`, 'gi');
  const parts = sentence.split(regex);
  
  const filteredParts: string[] = [];
  const filteredWords: string[] = [];
  
  for (let i = 0; i < parts.length; i++) {
    if (i % 2 === 0) {
      filteredParts.push(parts[i]);
    } else {
      filteredParts.push('');
      filteredWords.push(parts[i]);
    }
  }
  
  return { parts: filteredParts, actualWords: filteredWords };
}

export default function LearningSession() {
  const navigate = useNavigate();
  
  // 状态管理
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [wordData, setWordData] = useState<NextWordResponse | null>(null);
  const [currentMeaningIndex, setCurrentMeaningIndex] = useState(0);
  const [completedMeanings, setCompletedMeanings] = useState<Set<number>>(new Set());
  
  // 选择题状态
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [isCorrectAnswer, setIsCorrectAnswer] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // 当前词义的选项（固定，不会重新生成）
  const [quizOptions, setQuizOptions] = useState<string[]>([]);
  const [quizCorrectIndex, setQuizCorrectIndex] = useState<number>(0);
  
  // 单词总结页显示状态
  const [showWordSummary, setShowWordSummary] = useState(false);

  // TODO: 临时硬编码干扰项，后续需要后端生成
  const generateOptions = (correctDefinition: string) => {
    const distractors = [
      "测试；考试",
      "练习；实践",
      "经验；体验"
    ];
    
    const options = [correctDefinition, ...distractors];
    // 随机打乱顺序
    const shuffled = options.sort(() => Math.random() - 0.5);
    return {
      options: shuffled,
      correctIndex: shuffled.indexOf(correctDefinition)
    };
  };

  // 加载下一个单词
  const loadNextWord = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await learningApi.getNextWord();
      setWordData(data);
      setCurrentMeaningIndex(0);
      setSelectedOption(null);
      setShowFeedback(false);
      setCompletedMeanings(new Set());
      
      // 保存到 sessionStorage（用于页面刷新恢复）
      sessionStorage.setItem('currentLearningWord', JSON.stringify({
        wordData: data,
        currentMeaningIndex: 0,
        completedMeanings: []
      }));
    } catch (err: any) {
      if (err.message?.includes('恭喜') || err.message?.includes('学习完')) {
        setError('学习完成');
      } else {
        setError(err.message || '加载失败');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // 尝试从 sessionStorage 恢复状态
    const saved = sessionStorage.getItem('currentLearningWord');
    if (saved) {
      try {
        const { wordData: savedWordData, currentMeaningIndex: savedIndex, completedMeanings: savedCompleted } = JSON.parse(saved);
        setWordData(savedWordData);
        setCurrentMeaningIndex(savedIndex);
        setCompletedMeanings(new Set(savedCompleted));
        setLoading(false);
        return;
      } catch (err) {
        console.error('恢复学习状态失败:', err);
        sessionStorage.removeItem('currentLearningWord');
      }
    }
    
    // 没有保存的状态，加载新单词
    loadNextWord();
  }, []);

  // 当词义变化时生成选项
  useEffect(() => {
    if (!wordData) return;
    const currentMeaning = wordData.meanings[currentMeaningIndex];
    const { options, correctIndex } = generateOptions(currentMeaning.definition);
    setQuizOptions(options);
    setQuizCorrectIndex(correctIndex);
  }, [wordData, currentMeaningIndex]);

  // 选择选项
  const handleSelectOption = (index: number) => {
    if (showFeedback || submitting) return;
    setSelectedOption(index);
  };

  // 确认选择
  const handleConfirmSelection = () => {
    if (selectedOption === null || !wordData) return;
    
    const isCorrect = selectedOption === quizCorrectIndex;
    
    setIsCorrectAnswer(isCorrect);
    setShowFeedback(true);
  };

  // 继续下一个
  const handleNext = async () => {
    if (!wordData || submitting) return;

    const currentMeaning = wordData.meanings[currentMeaningIndex];
    
    try {
      setSubmitting(true);
      
      await learningApi.submitMeaning({
        meaningId: currentMeaning.meaningId,
        isCorrect: isCorrectAnswer
      });

      const newCompleted = new Set(completedMeanings);
      newCompleted.add(currentMeaning.meaningId);
      setCompletedMeanings(newCompleted);

      if (currentMeaningIndex < wordData.meanings.length - 1) {
        const newIndex = currentMeaningIndex + 1;
        setCurrentMeaningIndex(newIndex);
        setSelectedOption(null);
        setShowFeedback(false);
        
        // 更新 sessionStorage
        sessionStorage.setItem('currentLearningWord', JSON.stringify({
          wordData: wordData,
          currentMeaningIndex: newIndex,
          completedMeanings: Array.from(newCompleted)
        }));
      } else {
        // 所有词义学习完成，显示单词总结页
        setShowWordSummary(true);
        // 清除 sessionStorage（单词学习完成）
        sessionStorage.removeItem('currentLearningWord');
      }
    } catch (err: any) {
      setError(err.message || '提交失败');
    } finally {
      setSubmitting(false);
    }
  };

  // 完成单词学习，进入下一个单词
  const handleCompleteWord = async () => {
    if (!wordData || submitting) return;
    
    try {
      setSubmitting(true);
      await learningApi.completeWord({ wordId: wordData.wordId });
      
      // 重置状态，加载下一个单词
      setShowWordSummary(false);
      setCurrentMeaningIndex(0);
      setSelectedOption(null);
      setShowFeedback(false);
      await loadNextWord();
    } catch (err: any) {
      setError(err.message || '完成单词失败');
    } finally {
      setSubmitting(false);
    }
  };

  // 返回今日计划
  const handleBackToPlan = () => {
    navigate('/today-plan');
  };

  // 加载中状态
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  // 错误状态或提示信息
  if (error) {
    // 判断是哪种提示类型
    const isCompleted = error.includes('学习完成') || error.includes('目标已完成');
    const isReviewFirst = error.includes('请先完成复习') || error.includes('复习任务');
    
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <div className="text-6xl mb-4">
            {isCompleted ? '🎉' : isReviewFirst ? '📚' : '⚠️'}
          </div>
          <h2 className="text-2xl font-bold mb-2">
            {isCompleted ? '太棒了！' : isReviewFirst ? '温馨提示' : '提示'}
          </h2>
          <p className="text-gray-600 mb-6">
            {error}
          </p>
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

  if (!wordData) return null;

  // 显示单词总结页
  if (showWordSummary) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-2xl mx-auto">
          {/* 标题 */}
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{wordData.word}</h1>
            {wordData.pronunciation && (
              <p className="text-gray-600 text-lg">
                UK: {wordData.pronunciation.uk} | US: {wordData.pronunciation.us}
              </p>
            )}
          </div>

          {/* 所有词义列表 */}
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">单词总结</h2>
            <div className="space-y-6">
              {wordData.meanings.map((meaning, index) => (
                <div key={meaning.meaningId} className="border-l-4 border-blue-500 pl-4">
                  <h3 className="font-semibold text-gray-900 mb-2">
                    词义 {index + 1}：{meaning.definition}
                  </h3>
                  
                  {/* 该词义的所有例句 */}
                  <div className="space-y-2">
                    {meaning.examples.map((example, exIdx) => (
                      <div key={exIdx} className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-sm text-gray-700 leading-relaxed">
                          {example.sentence.split(new RegExp(`(${wordData.word})`, 'gi')).map((part: string, i: number) =>
                            part.toLowerCase() === wordData.word.toLowerCase() ? (
                              <span key={i} className="bg-yellow-200 text-blue-600 font-semibold">
                                {part}
                              </span>
                            ) : (
                              part
                            )
                          )}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* 相关信息 */}
                  {meaning.relatedInfo && typeof meaning.relatedInfo === 'object' && (
                    <div className="mt-3 text-sm text-gray-600">
                      {meaning.relatedInfo.synonyms && meaning.relatedInfo.synonyms.length > 0 && (
                        <p>
                          <span className="font-medium">近义词：</span>
                          {meaning.relatedInfo.synonyms.join('、')}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 完成按钮 */}
          <button
            onClick={handleCompleteWord}
            disabled={submitting}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-4 px-6 rounded-lg transition-colors"
          >
            {submitting ? '提交中...' : '完成单词，继续学习'}
          </button>
        </div>
      </div>
    );
  }

  const currentMeaning = wordData.meanings[currentMeaningIndex];
  const progress = `${currentMeaningIndex + 1}/${wordData.totalMeanings}`;
  const firstExample = currentMeaning.examples && currentMeaning.examples.length > 0 
    ? currentMeaning.examples[0] 
    : null;

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-2xl mx-auto">
        {/* 顶部导航栏 */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={handleBackToPlan}
            className="flex items-center text-gray-600 hover:text-gray-900"
          >
            <span className="mr-2">←</span>
            返回
          </button>
          <div className="text-sm text-gray-500">
            词义 {progress}
          </div>
        </div>

        {/* 单词卡片 */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
          {/* 单词标题 */}
          <div className="text-center mb-6">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              {wordData.word}
            </h1>
            {(wordData.pronunciation.uk || wordData.pronunciation.us) && (
              <div className="text-gray-500 space-x-4">
                {wordData.pronunciation.uk && (
                  <span>🇬🇧 {wordData.pronunciation.uk}</span>
                )}
                {wordData.pronunciation.us && (
                  <span>🇺🇸 {wordData.pronunciation.us}</span>
                )}
              </div>
            )}
          </div>

          {/* 词性标签 */}
          <div className="flex justify-center mb-6">
            <span className="inline-block bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
              {currentMeaning.partOfSpeech}
            </span>
          </div>

          {/* 情境引入：例句 */}
          {firstExample && (() => {
            const { parts, actualWords } = splitSentenceWithHighlight(firstExample.sentence, firstExample.highlightWord);
            let wordIndex = 0;
            
            return (
              <div className="mb-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h3 className="text-sm font-semibold text-blue-900 mb-2">📖 请根据例句选择含义</h3>
                <p className="text-lg text-gray-800 leading-relaxed">
                  {parts.map((part, idx) => {
                    if (idx % 2 === 0) {
                      return <span key={idx}>{part}</span>;
                    } else {
                      const actualWord = actualWords[wordIndex++];
                      return (
                        <span key={idx}>
                          <span className="font-bold text-blue-600 bg-yellow-100 px-1">
                            {actualWord}
                          </span>
                        </span>
                      );
                    }
                  })}
                </p>
                {firstExample.source && (
                  <p className="text-xs text-blue-600 mt-2">— {firstExample.source}</p>
                )}
              </div>
            );
          })()}

          {!showFeedback ? (
            <>
              {/* 选择题选项 */}
              <div className="space-y-3 mb-6">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">
                  请选择 "{wordData.word}" 在该句中的含义：
                </h3>
                {quizOptions.map((option: string, index: number) => (
                  <button
                    key={index}
                    onClick={() => handleSelectOption(index)}
                    className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                      selectedOption === index
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                    }`}
                  >
                    <span className="font-medium text-gray-700 mr-2">
                      {String.fromCharCode(65 + index)}.
                    </span>
                    <span className="text-gray-900">{option}</span>
                  </button>
                ))}
              </div>

              {/* 确认按钮 */}
              <button
                onClick={handleConfirmSelection}
                disabled={selectedOption === null}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium py-4 px-6 rounded-lg transition-colors"
              >
                确认选择
              </button>
            </>
          ) : (
            <>
              {/* 反馈区域 */}
              <div className={`mb-6 p-6 rounded-lg ${
                isCorrectAnswer ? 'bg-green-50 border-2 border-green-200' : 'bg-red-50 border-2 border-red-200'
              }`}>
                <div className="flex items-center mb-4">
                  <span className="text-4xl mr-3">
                    {isCorrectAnswer ? '✅' : '❌'}
                  </span>
                  <div>
                    <h3 className={`text-xl font-bold ${
                      isCorrectAnswer ? 'text-green-900' : 'text-red-900'
                    }`}>
                      {isCorrectAnswer ? '回答正确！' : '回答错误'}
                    </h3>
                    {!isCorrectAnswer && (
                      <p className="text-red-700 text-sm">
                        正确答案：{String.fromCharCode(65 + quizCorrectIndex)}. {quizOptions[quizCorrectIndex]}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* 详细释义 */}
              <div className="space-y-6 mb-6">
                <div>
                  <h3 className="text-sm font-semibold text-gray-500 mb-2">📝 详细释义</h3>
                  <p className="text-lg text-gray-900">{currentMeaning.definition}</p>
                  {currentMeaning.relatedInfo && typeof currentMeaning.relatedInfo === 'object' && currentMeaning.relatedInfo.synonyms && (
                    <p className="text-sm text-gray-500 mt-2">
                      <span className="font-medium">同义词：</span>
                      {Array.isArray(currentMeaning.relatedInfo.synonyms) 
                        ? currentMeaning.relatedInfo.synonyms.join(', ')
                        : JSON.stringify(currentMeaning.relatedInfo.synonyms)}
                    </p>
                  )}
                </div>

                {/* 更多例句 */}
                {currentMeaning.examples.length > 1 && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-500 mb-2">📚 更多例句</h3>
                    <div className="space-y-3">
                      {currentMeaning.examples.slice(1).map((example) => {
                        const { parts, actualWords } = splitSentenceWithHighlight(example.sentence, example.highlightWord);
                        let wordIndex = 0;
                        
                        return (
                          <div key={example.id} className="bg-gray-50 p-3 rounded-lg">
                            <p className="text-gray-800">
                              {parts.map((part, idx) => {
                                if (idx % 2 === 0) {
                                  return <span key={idx}>{part}</span>;
                                } else {
                                  const actualWord = actualWords[wordIndex++];
                                  return (
                                    <span key={idx}>
                                      <span className="font-bold text-blue-600">
                                        {actualWord}
                                      </span>
                                    </span>
                                  );
                                }
                              })}
                            </p>
                            {example.source && (
                              <p className="text-xs text-gray-400 mt-1">— {example.source}</p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* 继续按钮 */}
              <button
                onClick={handleNext}
                disabled={submitting}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-medium py-4 px-6 rounded-lg transition-colors"
              >
                {submitting ? '提交中...' : (
                  currentMeaningIndex < wordData.totalMeanings - 1 ? '下一个词义' : '完成单词'
                )}
              </button>
            </>
          )}
        </div>

        {/* 进度指示器 */}
        <div className="text-center">
          <div className="flex justify-center space-x-2 mb-2">
            {Array.from({ length: wordData.totalMeanings }).map((_, idx) => (
              <div
                key={idx}
                className={`w-3 h-3 rounded-full ${
                  completedMeanings.has(wordData.meanings[idx]?.meaningId)
                    ? 'bg-green-500'
                    : idx === currentMeaningIndex
                    ? 'bg-blue-500'
                    : 'bg-gray-300'
                }`}
              />
            ))}
          </div>
          <p className="text-sm text-gray-500">
            已完成 {completedMeanings.size}/{wordData.totalMeanings} 个词义
          </p>
        </div>

        {/* 词书信息 */}
        <div className="mt-6 text-center text-sm text-gray-400">
          📚 {wordData.bookTag}
        </div>
      </div>
    </div>
  );
}
