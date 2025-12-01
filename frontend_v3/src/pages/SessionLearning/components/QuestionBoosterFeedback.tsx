import { useEffect } from 'react';
import { learningSessionApi } from '../../../services/api';
import type { SessionResponse } from '../../../types/api';

interface QuestionBoosterFeedbackProps {
  sessionResp: SessionResponse;
  sessionId: string;
  continueLoading: boolean;
  setContinueLoading: (loading: boolean) => void;
  setSessionResp: (resp: SessionResponse) => void;
  setError: (error: string | null) => void;
  sessionMode: string;
}

export default function QuestionBoosterFeedback({
  sessionResp,
  sessionId,
  continueLoading,
  setContinueLoading,
  setSessionResp,
  setError,
  sessionMode
}: QuestionBoosterFeedbackProps) {
  const data = (sessionResp as any).data;
  const isBooster = data?.isBooster === true;

  // Auto-advance for booster if we land here (e.g. after refresh)
  // Note: The primary trigger is usually in the previous component's submit handler,
  // but this ensures we don't get stuck if that didn't fire or we refreshed.
  useEffect(() => {
    if (isBooster && !continueLoading) {
      const timer = setTimeout(async () => {
        if (continueLoading) return; // Prevent double submission
        // We don't setContinueLoading(true) here to avoid UI flicker if it's already loading from parent
        // But since we don't know parent state, we'll just try to load.
        // Actually, let's just rely on the user not being able to do anything.
        
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
          console.error('Auto-load next failed:', err);
          // Don't show error to user for auto-advance, just let them stuck? No, show error.
          // But maybe retry?
        }
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isBooster, sessionId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (isBooster) {
    return (
      <div className="bg-white rounded-lg p-8 text-center">
        <div className="text-6xl mb-6 animate-bounce">✅</div>
        <h2 className="text-3xl font-bold text-[#C89F7B] mb-3">
          {data?.message || '短期强化完成'}
        </h2>
        <p className="text-lg text-[#4A4A4A]">正在加载下一题...</p>
        <div className="mt-6">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600 mx-auto"></div>
        </div>
      </div>
    );
  }
  
  // 路径A答对：显示简洁反馈，需要用户点击"继续"
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
        const completeResp = { sessionId, type: 'session-complete', data: null } as SessionResponse;
        setSessionResp(completeResp);
        sessionStorage.setItem('sessionResp', JSON.stringify(completeResp));
      }
    } catch (err: any) {
      console.error('Failed to load next:', err);
      setError(`加载下一题失败: ${err.message}`);
    } finally {
      setContinueLoading(false);
    }
  };
  
  const btnColor = sessionMode === 'review-only' ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-amber-500 hover:bg-amber-600';
  const textColor = sessionMode === 'review-only' ? 'text-emerald-600' : 'text-amber-600';

  return (
    <div className="bg-white rounded-lg p-8 text-center border-2 border-gray-200">
      <div className="text-6xl mb-6">✅</div>
      <h2 className={`text-3xl font-bold ${textColor} mb-6`}>
        {data?.message || '回答正确'}
      </h2>
      <button
        onClick={handleContinue}
        disabled={continueLoading}
        className={`px-8 py-4 ${btnColor} text-white text-lg font-semibold rounded-lg shadow-sm transition-all hover:shadow-md disabled:opacity-60`}
      >
        {continueLoading ? '加载中...' : '继续'}
      </button>
    </div>
  );
}
