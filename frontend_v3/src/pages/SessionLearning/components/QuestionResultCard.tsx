import { useNavigate } from 'react-router-dom';
import { learningSessionApi } from '../../../services/api';
import type { SessionResponse } from '../../../types/api';

interface QuestionResultCardProps {
  sessionResp: SessionResponse;
  sessionId: string;
  continueLoading: boolean;
  setContinueLoading: (loading: boolean) => void;
  setSessionResp: (resp: SessionResponse) => void;
  setError: (error: string | null) => void;
  sessionMode: string;
  themeColors: {
    bg: string;
    bgLight: string;
    border: string;
    borderHover: string;
    bgHover: string;
    badge: string;
    badgeText: string;
  };
}

export default function QuestionResultCard({
  sessionResp,
  sessionId,
  continueLoading,
  setContinueLoading,
  setSessionResp,
  setError,
  sessionMode,
  themeColors
}: QuestionResultCardProps) {
  const navigate = useNavigate();
  const cardData = (sessionResp as any).data;
  const card = cardData?.card || {};
  const isCorrect = cardData?.isCorrect;
  const showResult = cardData?.showResult !== false;
  const isBooster = cardData?.isBooster === true;
  
  const handleContinue = async () => {
    if (!sessionId || continueLoading) return;
    setContinueLoading(true);
    try {
      const nextData = await learningSessionApi.getNextQuestions(sessionId, 1);
      const steps = nextData?.steps || [];
      const step = steps[0];

      if (step) {
        const newResp = { sessionId, type: step.type, data: step.data, step: step.step } as SessionResponse;
        setSessionResp(newResp);
        sessionStorage.setItem('sessionResp', JSON.stringify(newResp));
      } else {
        // 检查会话状态
        const state = await learningSessionApi.getSessionState(sessionId);
        const finalRespType = state.state === 'completed' ? 'session-complete' : 'session-complete';
        const finalResp = { sessionId, type: finalRespType, data: state } as SessionResponse;
        setSessionResp(finalResp);
        sessionStorage.setItem('sessionResp', JSON.stringify(finalResp));
      }
    } catch (err: any) {
      setError(`加载下一题失败: ${err.message}`);
    } finally {
      setContinueLoading(false);
    }
  };

  // 根据mode和booster状态确定主题色
  const cardBg = isBooster ? themeColors.bg : (sessionMode === 'review-only' ? 'bg-emerald-50' : 'bg-amber-50');
  const cardBorder = isBooster ? themeColors.border : (sessionMode === 'review-only' ? 'border-emerald-200' : 'border-amber-200');
  const btnPrimary = sessionMode === 'review-only' ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-amber-500 hover:bg-amber-600';
  const correctColor = sessionMode === 'review-only' ? 'text-emerald-600' : 'text-amber-600';

  return (
    <div className="bg-white rounded-lg p-6 md:p-8 shadow-sm border-2 border-gray-200">
      {showResult && (
        <div className={`mb-6 text-center text-2xl md:text-3xl font-bold ${
          isCorrect ? correctColor : 'text-red-600'
        }`}>
          {isCorrect ? '✅ 回答正确！' : '❌ 回答错误'}
        </div>
      )}
      
      {/* 显示单词和发音 - 特别重要对于拼写题 */}
      {card.word && (
        <div className="mb-6 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
            {card.word}
          </h2>
          {card.pronunciations && (
            <div className="flex justify-center gap-4 text-sm text-gray-600">
              {card.pronunciations.uk && (
                <span>🇬🇧 {card.pronunciations.uk}</span>
              )}
              {card.pronunciations.us && (
                <span>🇺🇸 {card.pronunciations.us}</span>
              )}
            </div>
          )}
          {/* 如果是拼写题且答错，显示用户的输入 */}
          {!isCorrect && card.userInput && (
            <p className="mt-2 text-red-500 text-base">
              <div className="text-red-500 text-lg mb-4">
              你的输入: <span className="font-mono">{card.userInput}</span>
            </div>
            </p>
          )}
        </div>
      )}
      
      <div className={`mb-6 p-4 md:p-6 rounded-lg border-2 ${cardBg} ${cardBorder}`}>
        <p className="text-sm text-gray-600 mb-1">释义</p>
        <h3 className="text-xl md:text-2xl font-semibold text-gray-900 mb-2">
          {card.definition || '(暂无释义)'}
        </h3>
        {card.partOfSpeech && (
          <p className="text-base text-gray-600">{card.partOfSpeech}</p>
        )}
      </div>
      
      {(card.examples && card.examples.length > 0) && (
        <div className="mb-6">
          <p className="text-sm text-gray-600 mb-2">更多例句</p>
          {card.examples.map((ex: any, idx: number) => (
            <div key={ex.id || idx} className="mt-2 pl-4 border-l-2 border-gray-300">
              <p className="text-gray-700 text-sm md:text-base italic leading-relaxed">
                {ex.sentence || ex}
              </p>
              {ex.translation && (
                <p className="text-gray-500 text-xs md:text-sm mt-1">
                  {ex.translation}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
      
      <div className="mt-6 flex gap-3">
        <button
          className={`flex-1 px-6 py-3 text-base ${btnPrimary} text-white font-semibold rounded-lg shadow-sm transition-all hover:shadow-md disabled:opacity-60`}
          disabled={continueLoading}
          onClick={handleContinue}
        >
          {continueLoading ? '加载中...' : '继续'}
        </button>
        <button
          className="px-6 py-3 text-base bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium rounded-lg transition-colors"
          onClick={() => navigate('/today-plan')}
        >
          返回
        </button>
      </div>
    </div>
  );
}
