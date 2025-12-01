import { useState } from 'react';
import { learningSessionApi } from '../../../services/api';
import type { SessionResponse } from '../../../types/api';

interface QuestionSpellingProps {
  sessionResp: SessionResponse;
  sessionId: string;
  continueLoading: boolean;
  setContinueLoading: (loading: boolean) => void;
  setSessionResp: (resp: SessionResponse) => void;
  setError: (error: string | null) => void;
}

export default function QuestionSpelling({
  sessionResp,
  sessionId,
  continueLoading,
  setContinueLoading,
  setSessionResp,
  setError
}: QuestionSpellingProps) {
  const [spellingInput, setSpellingInput] = useState('');
  const q = (sessionResp as any).data;

  const handleSubmit = async () => {
    if (!sessionId || continueLoading || !spellingInput.trim()) return;
    
    setContinueLoading(true);
    try {
      const resp = await learningSessionApi.actionSession({
        sessionId,
        action: 'submitSpelling',
        payload: {
          meaningId: q.meaningId,
          userInput: spellingInput.trim(),
        }
      });
      
      if (resp) {
        setSessionResp(resp as SessionResponse);
        sessionStorage.setItem('sessionResp', JSON.stringify(resp));
        setSpellingInput(''); // 清空输入
      }
    } catch (err: any) {
      console.error('submitSpelling failed', err);
      setError(err.message || '提交失败');
    } finally {
      setContinueLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg p-6 md:p-8 shadow-sm border-2 border-gray-200">
      <h3 className="text-lg md:text-xl font-semibold mb-6 text-center text-gray-800">{q.prompt}</h3>
      
      {/* 显示释义和词性 */}
      <div className="mb-6 p-4 md:p-6 rounded-lg bg-emerald-50 border-2 border-emerald-200">
        <p className="text-sm text-gray-600 mb-1">词性</p>
        <p className="text-base text-gray-700 mb-3">{q.partOfSpeech}</p>
        <p className="text-sm text-gray-600 mb-1">释义</p>
        <h4 className="text-xl md:text-2xl font-semibold text-gray-900">
          {q.definition}
        </h4>
      </div>

      {/* 拼写输入框 */}
      <div className="mb-6">
        <input
          type="text"
          value={spellingInput}
          onChange={(e) => setSpellingInput(e.target.value.toLowerCase())}
          placeholder="请输入单词拼写..."
          className="w-full p-4 text-lg border-2 border-gray-300 rounded-lg focus:outline-none focus:border-emerald-500"
          disabled={continueLoading}
          autoFocus
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleSubmit();
            }
          }}
        />
      </div>

      {/* 提交按钮 */}
      <button
        onClick={handleSubmit}
        disabled={continueLoading || !spellingInput.trim()}
        className="w-full px-6 py-4 bg-emerald-500 hover:bg-emerald-600 text-white text-lg font-semibold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
      >
        {continueLoading ? '提交中...' : '提交答案'}
      </button>
    </div>
  );
}
