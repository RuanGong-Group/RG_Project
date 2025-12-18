import HighlightedSentence from './HighlightedSentence';
import { formatPronunciation } from '../../../utils/text';

interface SessionHeaderProps {
  contextInfo: {
    word: string;
    pronunciations: { uk: string; us: string };
    sentence: string;
    translation?: string;
    highlightWord: string;
    wordProgress: any;
    isBooster: boolean;
    shouldMask: boolean;
  } | null;
  sessionType: string;
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

export default function SessionHeader({ contextInfo, sessionType, themeColors }: SessionHeaderProps) {
  if (!contextInfo || !contextInfo.word || sessionType === 'session-complete' || sessionType === 'show-word-summary') {
    return null;
  }

  const { isBooster, shouldMask, word, pronunciations, sentence, highlightWord, wordProgress } = contextInfo;

  const handlePlayAudio = (text: string, type: 'uk' | 'us' = 'us') => {
    if (!text) return;
    const utterance = new SpeechSynthesisUtterance(text);
    // 设置语言/口音
    utterance.lang = type === 'uk' ? 'en-GB' : 'en-US';
    
    // 尝试查找特定的声音 (可选优化)
    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      const targetLang = type === 'uk' ? 'en-GB' : 'en-US';
      const preferredVoice = voices.find(v => v.lang === targetLang && !v.name.includes('Microsoft Mark')); // 避开某些特定声音，或者优先选 Google/Apple
      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }
    }

    window.speechSynthesis.cancel(); // 停止之前的发音
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className={`${isBooster ? `${themeColors.bgLight} border-b-2 ${themeColors.borderHover}` : 'bg-white border-b-2 border-gray-200'} p-6 md:p-8`}>
      <div className="max-w-4xl mx-auto">
        {/* Booster 标签 */}
        {isBooster && (
          <div className="text-center mb-6">
            <span className={`inline-block px-6 py-3 ${themeColors.badge} ${themeColors.badgeText} rounded-full text-xl md:text-2xl font-bold shadow-md`}>
              🔄 短期强化
            </span>
          </div>
        )}
        
        {/* 单词 - 拼写题不显示 */}
        {!shouldMask && (
          <h1 className="text-5xl md:text-6xl font-serif font-bold text-center mb-4 text-gray-900 tracking-wide">{word}</h1>
        )}
        
        {/* 音标 - 拼写题不显示 */}
        {!shouldMask && pronunciations && (
          <p className="text-base md:text-lg text-gray-500 text-center mb-8 font-mono flex justify-center gap-4">
            {formatPronunciation(pronunciations).uk && (
              <span 
                className="cursor-pointer hover:text-blue-600 transition-colors"
                onClick={() => handlePlayAudio(word, 'uk')}
                title="播放英式发音"
              >
                🇬🇧 {formatPronunciation(pronunciations).uk} 🔊
              </span>
            )}
            {formatPronunciation(pronunciations).us && (
              <span 
                className="cursor-pointer hover:text-blue-600 transition-colors"
                onClick={() => handlePlayAudio(word, 'us')}
                title="播放美式发音"
              >
                🇺🇸 {formatPronunciation(pronunciations).us} 🔊
              </span>
            )}
          </p>
        )}
        
        {/* 例句 */}
        {sentence && (
          <div className={`${isBooster ? `${themeColors.bg} ${themeColors.border}` : 'bg-gray-50 border-gray-200'} rounded-xl p-6 md:p-8 border shadow-sm max-w-2xl mx-auto relative`}>
            <p className="text-lg md:text-xl leading-relaxed text-gray-700 text-center font-medium">
              {shouldMask ? (
                // 挖空模式: 直接显示带下划线的文本
                <span className="font-mono">{sentence}</span>
              ) : (
                // 高亮模式: 高亮显示目标单词
                <HighlightedSentence 
                  sentence={sentence} 
                  highlight={highlightWord} 
                />
              )}
            </p>
            {/* 播放按钮 - 放在右下角或跟随文本 */}
            <div className="mt-4 flex justify-center">
               <button 
                 onClick={() => handlePlayAudio(sentence, 'us')}
                 className="text-gray-400 hover:text-blue-600 transition-colors p-2 rounded-full hover:bg-gray-100"
                 title="播放例句"
               >
                 🔊 播放例句
               </button>
            </div>
          </div>
        )}
        
        {/* 进度提示 */}
        {wordProgress && (
          <p className="text-center text-sm text-gray-500 mt-4">
            词义 {wordProgress.currentMeaning}/{wordProgress.totalMeanings}
          </p>
        )}
      </div>
    </div>
  );
}
