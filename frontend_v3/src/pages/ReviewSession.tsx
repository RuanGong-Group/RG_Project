/**
 * 复习会话页面
 * 测试点4：根据艾宾浩斯记忆曲线复习词义
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { reviewApi } from '../services/api';
import type { ReviewItem } from '../types/api';

/**
 * 辅助函数：不区分大小写地高亮句子中的单词
 * @param sentence 句子
 * @param highlightWord 要高亮的单词（可能与句子中的大小写不同）
 * @returns 分割后的部分和匹配到的实际单词
 */
function splitSentenceWithHighlight(sentence: string, highlightWord: string): {
  parts: string[];
  actualWords: string[];
} {
  if (!highlightWord) {
    return { parts: [sentence], actualWords: [] };
  }

  // 使用正则表达式进行不区分大小写的分割
  // 同时捕获匹配到的实际单词（保留原始大小写）
  const regex = new RegExp(`(${highlightWord})`, 'gi');
  const parts = sentence.split(regex);
  
  // 提取所有匹配到的实际单词
  const actualWords: string[] = [];
  for (let i = 1; i < parts.length; i += 2) {
    actualWords.push(parts[i]);
  }
  
  // 过滤掉空字符串，但保留匹配位置的信息
  const filteredParts: string[] = [];
  const filteredWords: string[] = [];
  
  for (let i = 0; i < parts.length; i++) {
    if (i % 2 === 0) {
      // 普通文本部分
      filteredParts.push(parts[i]);
    } else {
      // 匹配的单词
      filteredParts.push(''); // 占位符
      filteredWords.push(parts[i]);
    }
  }
  
  return { parts: filteredParts, actualWords: filteredWords };
}

export default function ReviewSession() {
  const navigate = useNavigate();

  // 复习数据状态
  const [reviewList, setReviewList] = useState<ReviewItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [totalReviews, setTotalReviews] = useState(0);
  const [bookTag, setBookTag] = useState('');
  
  // 交互状态
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [isCorrectAnswer, setIsCorrectAnswer] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // 当前词义的选项（固定，不会重新生成）
  const [quizOptions, setQuizOptions] = useState<string[]>([]);
  const [quizCorrectIndex, setQuizCorrectIndex] = useState<number>(0);
  
  // 拼写输入状态（用于 production 模式）
  const [spellingInput, setSpellingInput] = useState('');
  
  // 复习统计
  const [completedCount, setCompletedCount] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  
  // TODO: 硬编码的干扰项（临时方案，后续需要后端智能生成）
  const generateOptions = (correctDefinition: string) => {
    const distractors = ["测试；考试", "练习；实践", "经验；体验"];
    const allOptions = [correctDefinition, ...distractors];
    const shuffled = allOptions.sort(() => Math.random() - 0.5);
    return {
      options: shuffled,
      correctIndex: shuffled.indexOf(correctDefinition)
    };
  };

  // 加载今日复习任务
  const loadReviewList = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await reviewApi.getTodayReview();
      
      if (data.totalReviews === 0 || data.reviews.length === 0) {
        setError('暂无复习任务');
        return;
      }
      
      setReviewList(data.reviews);
      setTotalReviews(data.totalReviews);
      setBookTag(data.bookTag);
      setCurrentIndex(0);
      
      // 保存到 sessionStorage（用于页面刷新恢复）
      sessionStorage.setItem('currentReviewSession', JSON.stringify({
        reviewList: data.reviews,
        currentIndex: 0,
        totalReviews: data.totalReviews,
        bookTag: data.bookTag,
        completedCount: 0,
        correctCount: 0
      }));
    } catch (err: any) {
      setError(err.message || '加载复习任务失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // 尝试从 sessionStorage 恢复状态
    const saved = sessionStorage.getItem('currentReviewSession');
    if (saved) {
      try {
        const { reviewList: savedList, currentIndex: savedIndex, totalReviews: savedTotal, bookTag: savedTag, completedCount: savedCompleted, correctCount: savedCorrect } = JSON.parse(saved);
        setReviewList(savedList);
        setCurrentIndex(savedIndex);
        setTotalReviews(savedTotal);
        setBookTag(savedTag);
        setCompletedCount(savedCompleted);
        setCorrectCount(savedCorrect);
        setLoading(false);
        return;
      } catch (err) {
        console.error('恢复复习状态失败:', err);
        sessionStorage.removeItem('currentReviewSession');
      }
    }
    
    // 没有保存的状态，加载新任务
    loadReviewList();
  }, []);

  // 当词义变化时生成选项
  useEffect(() => {
    if (reviewList.length === 0 || currentIndex >= reviewList.length) return;
    const currentReview = reviewList[currentIndex];
    const { options, correctIndex } = generateOptions(currentReview.definition);
    setQuizOptions(options);
    setQuizCorrectIndex(correctIndex);
  }, [reviewList, currentIndex]);

  // 选择选项
  const handleSelectOption = (index: number) => {
    if (showFeedback || submitting) return;
    setSelectedOption(index);
  };

  // 确认选择（选择题模式）
  const handleConfirmSelection = () => {
    if (selectedOption === null) return;
    
    const isCorrect = selectedOption === quizCorrectIndex;
    setIsCorrectAnswer(isCorrect);
    setShowFeedback(true);
  };

  // 检查拼写（拼写模式）
  const handleCheckSpelling = () => {
    if (!spellingInput.trim()) return;
    
    const currentReview = reviewList[currentIndex];
    const isCorrect = spellingInput.trim().toLowerCase() === currentReview.word.toLowerCase();
    setIsCorrectAnswer(isCorrect);
    setShowFeedback(true);
  };

  // 继续下一个
  const handleNext = async () => {
    if (submitting) return;

    const currentReview = reviewList[currentIndex];
    
    try {
      setSubmitting(true);
      
      await reviewApi.submitReview({
        meaningId: currentReview.meaningId,
        isCorrect: isCorrectAnswer
      });

      const newCompletedCount = completedCount + 1;
      const newCorrectCount = isCorrectAnswer ? correctCount + 1 : correctCount;
      setCompletedCount(newCompletedCount);
      setCorrectCount(newCorrectCount);

      if (currentIndex < reviewList.length - 1) {
        const newIndex = currentIndex + 1;
        setCurrentIndex(newIndex);
        setSelectedOption(null);
        setSpellingInput(''); // 清空拼写输入
        setShowFeedback(false);
        
        // 更新 sessionStorage
        sessionStorage.setItem('currentReviewSession', JSON.stringify({
          reviewList,
          currentIndex: newIndex,
          totalReviews,
          bookTag,
          completedCount: newCompletedCount,
          correctCount: newCorrectCount
        }));
      } else {
        // 所有复习完成，清除缓存
        sessionStorage.removeItem('currentReviewSession');
        setError('复习完成');
      }
    } catch (err: any) {
      setError(err.message || '提交失败');
    } finally {
      setSubmitting(false);
    }
  };

  // 返回今日计划
  const handleBackToPlan = () => {
    navigate('/today-plan');
  };

  // 加载中
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">加载复习任务中...</p>
        </div>
      </div>
    );
  }

  // 错误或完成状态
  if (error) {
    const isComplete = error === '复习完成';
    const isNoTask = error === '暂无复习任务';
    
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <div className="text-6xl mb-4">
            {isComplete ? '🎉' : isNoTask ? '📚' : '⚠️'}
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {isComplete ? '太棒了！' : isNoTask ? '暂无复习任务' : '出错了'}
          </h2>
          <p className="text-gray-600 mb-6">
            {isComplete 
              ? `今日复习任务已完成！共复习 ${completedCount} 个词义，正确 ${correctCount} 个。` 
              : isNoTask
              ? '今天暂时没有需要复习的内容，继续学习新单词吧！'
              : error}
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

  if (reviewList.length === 0) return null;

  const currentReview = reviewList[currentIndex];
  const progress = `${currentIndex + 1}/${totalReviews}`;
  const firstExample = currentReview.examples && currentReview.examples.length > 0 
    ? currentReview.examples[0] 
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
            复习进度 {progress}
          </div>
        </div>

        {/* 单词卡片 */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
          {/* 单词标题 - 拼写模式下隐藏，选择题模式下显示 */}
          {currentReview.reviewMode === 'recognition' && (
            <div className="text-center mb-6">
              <h1 className="text-4xl font-bold text-gray-900 mb-2">
                {currentReview.word}
              </h1>
              {(currentReview.pronunciation.uk || currentReview.pronunciation.us) && (
                <div className="text-gray-500 space-x-4">
                  {currentReview.pronunciation.uk && (
                    <span>🇬🇧 {currentReview.pronunciation.uk}</span>
                  )}
                  {currentReview.pronunciation.us && (
                    <span>🇺🇸 {currentReview.pronunciation.us}</span>
                  )}
                </div>
              )}
            </div>
          )}
          
          {/* 拼写模式下的提示 */}
          {currentReview.reviewMode === 'production' && !showFeedback && (
            <div className="text-center mb-6">
              <div className="inline-block bg-yellow-100 text-yellow-800 px-4 py-2 rounded-lg">
                <span className="text-2xl mr-2">✍️</span>
                <span className="font-semibold">拼写复习</span>
              </div>
              <p className="text-sm text-gray-500 mt-2">
                根据词义和例句，拼写出正确的单词
              </p>
            </div>
          )}
          
          {/* 拼写模式反馈后显示单词 */}
          {currentReview.reviewMode === 'production' && showFeedback && (
            <div className="text-center mb-6">
              <h1 className="text-4xl font-bold text-gray-900 mb-2">
                {currentReview.word}
              </h1>
              {(currentReview.pronunciation.uk || currentReview.pronunciation.us) && (
                <div className="text-gray-500 space-x-4">
                  {currentReview.pronunciation.uk && (
                    <span>🇬🇧 {currentReview.pronunciation.uk}</span>
                  )}
                  {currentReview.pronunciation.us && (
                    <span>🇺🇸 {currentReview.pronunciation.us}</span>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 词性标签 */}
          <div className="flex justify-center mb-6">
            <span className="inline-block bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
              {currentReview.partOfSpeech}
            </span>
          </div>

          {/* 情境引入：例句 */}
          {firstExample && (() => {
            const { parts, actualWords } = splitSentenceWithHighlight(firstExample.sentence, firstExample.highlightWord);
            let wordIndex = 0;
            
            return (
              <div className="mb-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h3 className="text-sm font-semibold text-blue-900 mb-2">
                  {currentReview.reviewMode === 'production' ? '📖 例句参考' : '📖 请根据例句选择含义'}
                </h3>
                <p className="text-lg text-gray-800 leading-relaxed">
                  {parts.map((part, idx) => {
                    // 偶数索引是普通文本，奇数索引是占位符（需要插入高亮单词）
                    if (idx % 2 === 0) {
                      return <span key={idx}>{part}</span>;
                    } else {
                      const actualWord = actualWords[wordIndex++];
                      return (
                        <span key={idx}>
                          {currentReview.reviewMode === 'production' && !showFeedback ? (
                            /* 拼写模式：用下划线代替单词 */
                            <span className="inline-block border-b-2 border-blue-600 mx-1" style={{ minWidth: '80px', height: '24px' }}>
                              <span className="invisible">{actualWord}</span>
                            </span>
                          ) : (
                            /* 选择题模式或已提交答案：显示高亮单词 */
                            <span className="font-bold text-blue-600 bg-yellow-100 px-1">
                              {actualWord}
                            </span>
                          )}
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

          {/* 复习模式：选择题 or 拼写输入 */}
          {!showFeedback ? (
            currentReview.reviewMode === 'production' ? (
              /* 拼写模式 */
              <div className="mb-8">
                {/* 词义提示 */}
                <div className="mb-4 p-4 bg-purple-50 rounded-lg border border-purple-200">
                  <h3 className="text-sm font-semibold text-purple-900 mb-2">📝 词义提示</h3>
                  <p className="text-lg text-purple-800">
                    <span className="font-medium">{currentReview.partOfSpeech}</span>
                    <span className="mx-2">·</span>
                    <span>{currentReview.definition}</span>
                  </p>
                </div>
                
                <h3 className="text-sm font-semibold text-gray-700 mb-3">
                  ✍️ 请拼写出上述含义的单词：
                </h3>
                <div className="mb-4">
                  <input
                    type="text"
                    value={spellingInput}
                    onChange={(e) => setSpellingInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleCheckSpelling();
                      }
                    }}
                    placeholder="在此输入单词拼写..."
                    className="w-full p-4 text-lg border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                    autoFocus
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    💡 提示：请输入英文单词，按回车键提交
                  </p>
                </div>
                <button
                  onClick={handleCheckSpelling}
                  disabled={!spellingInput.trim()}
                  className={`w-full py-3 px-6 rounded-lg font-medium transition-colors ${
                    spellingInput.trim()
                      ? 'bg-blue-600 hover:bg-blue-700 text-white'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  检查拼写
                </button>
              </div>
            ) : (
              /* 选择题模式 */
              <div className="mb-8">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">
                  请选择 "{currentReview.word}" 在该句中的含义：
                </h3>
                {quizOptions.map((option: string, index: number) => (
                  <button
                    key={index}
                    onClick={() => handleSelectOption(index)}
                    className={`w-full text-left p-4 rounded-lg border-2 transition-all mb-2 ${
                      selectedOption === index
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                    }`}
                  >
                    <span className="font-semibold mr-3">{String.fromCharCode(65 + index)}.</span>
                    {option}
                  </button>
                ))}
              </div>
            )
          ) : (
            /* 反馈区域 */
            <div className="mb-8">
              <div className={`p-4 rounded-lg mb-4 ${
                isCorrectAnswer ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
              }`}>
                <div className="flex items-center mb-2">
                  <span className="text-2xl mr-2">{isCorrectAnswer ? '✅' : '❌'}</span>
                  <h3 className={`text-lg font-semibold ${
                    isCorrectAnswer ? 'text-green-900' : 'text-red-900'
                  }`}>
                    {isCorrectAnswer ? '回答正确！' : '回答错误'}
                  </h3>
                </div>
                {!isCorrectAnswer && (
                  currentReview.reviewMode === 'production' ? (
                    /* 拼写模式：显示正确的单词 */
                    <p className="text-red-700 text-sm">
                      正确拼写：<span className="font-bold text-lg">{currentReview.word}</span>
                    </p>
                  ) : (
                    /* 选择题模式：显示正确选项 */
                    <p className="text-red-700 text-sm">
                      正确答案：{String.fromCharCode(65 + quizCorrectIndex)}. {quizOptions[quizCorrectIndex]}
                    </p>
                  )
                )}
              </div>

              {/* 详细释义 */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">📝 详细释义</h4>
                <p className="text-gray-800 mb-3">{currentReview.definition}</p>

                {/* 相关信息 */}
                {currentReview.relatedInfo && typeof currentReview.relatedInfo === 'object' && currentReview.relatedInfo.synonyms && currentReview.relatedInfo.synonyms.length > 0 && (
                  <div className="mb-3">
                    <span className="text-sm text-gray-600">近义词：</span>
                    <span className="text-sm text-blue-600 ml-2">
                      {currentReview.relatedInfo.synonyms.join('、')}
                    </span>
                  </div>
                )}

                {/* 更多例句 */}
                {currentReview.examples.length > 1 && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">📚 更多例句</h4>
                    {currentReview.examples.slice(1).map((example, idx) => (
                      <p key={idx} className="text-sm text-gray-700 mb-2 leading-relaxed">
                        • {example.sentence}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 按钮 */}
          {!showFeedback ? (
            <button
              onClick={handleConfirmSelection}
              disabled={selectedOption === null}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium py-3 px-6 rounded-lg transition-colors"
            >
              确认选择
            </button>
          ) : (
            <button
              onClick={handleNext}
              disabled={submitting}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-3 px-6 rounded-lg transition-colors"
            >
              {submitting ? '提交中...' : (currentIndex < reviewList.length - 1 ? '下一个词义' : '完成复习')}
            </button>
          )}
        </div>

        {/* 底部信息 */}
        <div className="text-center text-sm text-gray-500">
          📚 {bookTag} | 掌握级别：{currentReview.masteryLevel} | 复习次数：{currentReview.reviewCount}
        </div>
      </div>
    </div>
  );
}
