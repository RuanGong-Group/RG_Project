import HighlightedSentence from './HighlightedSentence';

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
          <h1 className="text-4xl md:text-5xl font-bold text-center mb-3 text-gray-900">{word}</h1>
        )}
        
        {/* 音标 - 拼写题不显示 */}
        {!shouldMask && pronunciations && (pronunciations.uk || pronunciations.us) && (
          <p className="text-base md:text-lg text-gray-600 text-center mb-6">
            {pronunciations.uk && `UK: ${pronunciations.uk}`}
            {pronunciations.uk && pronunciations.us && ' | '}
            {pronunciations.us && `US: ${pronunciations.us}`}
          </p>
        )}
        
        {/* 例句 */}
        {sentence && (
          <div className={`${isBooster ? `${themeColors.bg} ${themeColors.border}` : 'bg-gray-50 border-gray-200'} rounded-lg p-4 md:p-6 border-2`}>
            <p className="text-lg md:text-xl leading-relaxed text-gray-800 text-center">
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
