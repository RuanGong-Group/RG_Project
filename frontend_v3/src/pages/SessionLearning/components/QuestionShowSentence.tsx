
interface QuestionShowSentenceProps {
  handleChoosePath: (path: 'A' | 'B' | 'C') => void;
  continueLoading: boolean;
}

export default function QuestionShowSentence({ handleChoosePath, continueLoading }: QuestionShowSentenceProps) {
  return (
    <div className="bg-white rounded-lg p-6 md:p-8 shadow-sm border-2 border-gray-200">
      <h2 className="text-xl md:text-2xl font-semibold mb-8 text-center text-gray-800">
        你对这个单词的掌握程度？
      </h2>
      <div className="flex flex-col md:flex-row gap-4 justify-center">
        <button 
          onClick={() => handleChoosePath('A')} 
          disabled={continueLoading} 
          className="flex-1 px-8 py-4 bg-[#E8D5C4] hover:bg-[#D4A574] text-[#4A4A4A] hover:text-white text-base md:text-lg font-semibold rounded-lg disabled:opacity-50 transition-all hover:shadow-md"
        >
          我认识
        </button>
        <button 
          onClick={() => handleChoosePath('B')} 
          disabled={continueLoading} 
          className="flex-1 px-8 py-4 bg-[#D4A574] hover:bg-[#B8935F] text-white text-base md:text-lg font-semibold rounded-lg disabled:opacity-50 transition-all hover:shadow-md"
        >
          感觉模糊
        </button>
        <button 
          onClick={() => handleChoosePath('C')} 
          disabled={continueLoading} 
          className="flex-1 px-8 py-4 bg-[#B8935F] hover:bg-[#A67F5E] text-white text-base md:text-lg font-semibold rounded-lg disabled:opacity-50 transition-all hover:shadow-md"
        >
          不认识
        </button>
      </div>
    </div>
  );
}
