import { useNavigate } from 'react-router-dom';
import { learningSessionApi } from '../../../services/api';
import type { SessionResponse } from '../../../types/api';
import { parseDefinition, formatPronunciation } from '../../../utils/text';

interface WordSummaryProps {
  sessionResp: SessionResponse;
  sessionId: string;
  continueLoading: boolean;
  setContinueLoading: (loading: boolean) => void;
  setSessionResp: (resp: SessionResponse) => void;
  setError: (error: string | null) => void;
  sessionMode: string;
}

export default function WordSummary({
  sessionResp,
  sessionId,
  continueLoading,
  setContinueLoading,
  setSessionResp,
  setError,
  sessionMode
}: WordSummaryProps) {
  const navigate = useNavigate();
  const data = (sessionResp as any).data;
  const word = data?.word || {};
  
  const handleNextWord = async () => {
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
              const completeResp = { sessionId, type: 'session-complete', data: null } as SessionResponse;
              setSessionResp(completeResp);
              sessionStorage.setItem('sessionResp', JSON.stringify(completeResp));
          }
      } catch (err: any) {
          setError(`获取下一个单词失败: ${err.message}`);
      } finally {
          setContinueLoading(false);
      }
  };

  // 根据mode设置总结页的主题
  const summaryIcon = sessionMode === 'review-only' ? '✅' : '📚';
  const summaryText = sessionMode === 'review-only' 
    ? '已完成本单词所有词义的复习！' 
    : '已完成本单词所有词义的学习！';
  const borderColor = sessionMode === 'review-only' ? 'border-emerald-500' : 'border-amber-500';
  const btnPrimary = sessionMode === 'review-only' 
    ? 'bg-emerald-500 hover:bg-emerald-600' 
    : 'bg-amber-500 hover:bg-amber-600';
  const btnSecondary = sessionMode === 'review-only'
    ? 'bg-emerald-100 hover:bg-emerald-200 text-emerald-700 hover:text-emerald-900'
    : 'bg-amber-100 hover:bg-amber-200 text-amber-700 hover:text-amber-900';

  return (
    <div className="bg-white rounded-lg p-8">
      <div className="text-center mb-8">
        <h2 className="text-4xl font-bold mb-3">{word.word}</h2>
        {word.pronunciations && (
          <p className="text-gray-600 text-lg mb-4">
            UK: {formatPronunciation(word.pronunciations).uk} | US: {formatPronunciation(word.pronunciations).us}
          </p>
        )}
        <div className="text-5xl mb-4">{summaryIcon}</div>
        <p className="text-xl text-gray-700">{summaryText}</p>
        <p className="text-base text-gray-500 mt-3">💡 后续可能还有短期强化练习</p>
      </div>
      
      <div className="space-y-4 mb-8">
        <h3 className="text-xl font-semibold">词义总结</h3>
        {(word.meanings || []).map((m: any, idx: number) => {
          const { en, cn } = parseDefinition(m.definition);
          return (
            <div key={m.meaningId || idx} className={`border-l-4 ${borderColor} pl-4 py-3`}>
              <p className="text-gray-800 text-base font-medium">{m.partOfSpeech}. {en}</p>
              {cn && <p className="text-gray-600 text-sm mt-1">{cn}</p>}
            </div>
          );
        })}
      </div>

      <div className="mt-8 flex gap-3">
        <button
          className={`flex-1 px-6 py-3 text-base ${btnPrimary} text-white font-semibold rounded-lg disabled:opacity-60 transition-all`}
          disabled={continueLoading}
          onClick={handleNextWord}
        >{continueLoading ? '加载中...' : '下一个单词'}</button>
        <button
          className={`px-6 py-3 text-base ${btnSecondary} font-medium rounded-lg transition-all`}
          onClick={() => navigate('/today-plan')}
        >返回计划</button>
      </div>
    </div>
  );
}
