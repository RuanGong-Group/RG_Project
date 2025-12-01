import { useState } from 'react';
import { bookApi } from '../services/api';

interface Word {
  wordId: number;
  word: string;
  lemma: string;
  pronunciations: any;
  meanings: Array<{
    meaningId: number;
    partOfSpeech: string;
    definition: string;
  }>;
}

interface BookWordsResponse {
  bookId: number;
  bookName: string;
  salt: string;
  words: Word[];
  total: number;
}

export default function BookWordsTest() {
  const [loading, setLoading] = useState(false);
  const [data1, setData1] = useState<BookWordsResponse | null>(null);
  const [data2, setData2] = useState<BookWordsResponse | null>(null);
  const [data3, setData3] = useState<BookWordsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchWords = async (setData: (data: BookWordsResponse) => void) => {
    try {
      setError(null);
      setLoading(true);
      const response = await bookApi.getBookWords(1, 10);
      setData(response);
    } catch (err: any) {
      setError(err.message || '获取失败');
    } finally {
      setLoading(false);
    }
  };

  const reshuffle = async () => {
    try {
      setError(null);
      setLoading(true);
      await bookApi.reshuffleBook(1);
      alert('重新乱序成功！');
    } catch (err: any) {
      setError(err.message || '重新乱序失败');
    } finally {
      setLoading(false);
    }
  };

  const compareOrder = (words1: Word[], words2: Word[]) => {
    if (!words1 || !words2 || words1.length !== words2.length) return false;
    return words1.every((w, i) => w.word === words2[i].word);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">📚 稳定乱序功能测试</h1>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            ❌ {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 第一次获取 */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">第1次获取</h2>
              <button
                onClick={() => fetchWords(setData1)}
                disabled={loading}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
              >
                获取
              </button>
            </div>

            {data1 && (
              <>
                <div className="text-sm text-gray-600 mb-4">
                  <div>词书: {data1.bookName}</div>
                  <div className="font-mono text-xs mt-1">
                    Salt: {data1.salt ? data1.salt.substring(0, 16) + '...' : '未获取到'}
                  </div>
                </div>

                <div className="space-y-2">
                  {data1.words.map((word, i) => (
                    <div key={word.wordId} className="p-3 bg-gray-50 rounded">
                      <div className="font-semibold">
                        {i + 1}. {word.word}
                      </div>
                      <div className="text-sm text-gray-600">
                        {word.meanings.length} 个词义
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* 第二次获取 */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">第2次获取</h2>
              <button
                onClick={() => fetchWords(setData2)}
                disabled={loading || !data1}
                className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
              >
                获取
              </button>
            </div>

            {data2 && (
              <>
                <div className="text-sm text-gray-600 mb-4">
                  <div>词书: {data2.bookName}</div>
                  <div className="font-mono text-xs mt-1">
                    Salt: {data2.salt ? data2.salt.substring(0, 16) + '...' : '未获取到'}
                  </div>
                  {data1 && (
                    <div className={`mt-2 p-2 rounded ${
                      compareOrder(data1.words, data2.words)
                        ? 'bg-green-50 text-green-700'
                        : 'bg-red-50 text-red-700'
                    }`}>
                      {compareOrder(data1.words, data2.words)
                        ? '✅ 顺序相同（稳定）'
                        : '❌ 顺序不同'}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  {data2.words.map((word, i) => (
                    <div key={word.wordId} className="p-3 bg-gray-50 rounded">
                      <div className="font-semibold">
                        {i + 1}. {word.word}
                      </div>
                      <div className="text-sm text-gray-600">
                        {word.meanings.length} 个词义
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* 第三次获取（重新乱序后） */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">第3次获取</h2>
              <button
                onClick={() => fetchWords(setData3)}
                disabled={loading || !data2}
                className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50"
              >
                获取
              </button>
            </div>

            {data3 && (
              <>
                <div className="text-sm text-gray-600 mb-4">
                  <div>词书: {data3.bookName}</div>
                  <div className="font-mono text-xs mt-1">
                    Salt: {data3.salt ? data3.salt.substring(0, 16) + '...' : '未获取到'}
                  </div>
                  {data1 && (
                    <div className={`mt-2 p-2 rounded ${
                      !compareOrder(data1.words, data3.words)
                        ? 'bg-green-50 text-green-700'
                        : 'bg-yellow-50 text-yellow-700'
                    }`}>
                      {!compareOrder(data1.words, data3.words)
                        ? '✅ 顺序不同（乱序成功）'
                        : '⚠️ 顺序相同（数据太少）'}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  {data3.words.map((word, i) => (
                    <div key={word.wordId} className="p-3 bg-gray-50 rounded">
                      <div className="font-semibold">
                        {i + 1}. {word.word}
                      </div>
                      <div className="text-sm text-gray-600">
                        {word.meanings.length} 个词义
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* 重新乱序按钮 */}
        <div className="mt-8 text-center">
          <button
            onClick={reshuffle}
            disabled={loading || !data2}
            className="px-8 py-3 bg-orange-500 text-white text-lg font-semibold rounded-lg hover:bg-orange-600 disabled:opacity-50"
          >
            🔀 重新乱序
          </button>
          <p className="mt-2 text-sm text-gray-600">
            点击后再点击"第3次获取"查看新顺序
          </p>
        </div>

        {/* 测试说明 */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-semibold text-lg mb-3">🧪 测试步骤：</h3>
          <ol className="space-y-2 text-sm">
            <li>1️⃣ 点击"第1次获取"按钮，记录单词顺序</li>
            <li>2️⃣ 点击"第2次获取"按钮，验证顺序是否相同（应该相同）</li>
            <li>3️⃣ 点击"🔀 重新乱序"按钮，生成新的salt</li>
            <li>4️⃣ 点击"第3次获取"按钮，验证顺序是否改变（应该不同）</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
