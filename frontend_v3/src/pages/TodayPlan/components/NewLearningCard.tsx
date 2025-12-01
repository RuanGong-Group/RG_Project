import type { TodayPlanResponse } from '../../../types/api';

interface NewLearningCardProps {
  plan: TodayPlanResponse;
}

export default function NewLearningCard({ plan }: NewLearningCardProps) {
  return (
    <div style={{
      backgroundColor: 'white',
      borderRadius: '8px',
      padding: '24px',
      marginBottom: '16px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
    }}>
      <h2 style={{ fontSize: '18px', marginBottom: '16px' }}>
        📖 待学新词（配额：{plan.newLearning.quota} 个 | 可学：{plan.newLearning.available} 个）
      </h2>
      {plan.newLearning.available > 0 && plan.newLearning.quota > 0 ? (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          maxHeight: '200px',
          overflowY: 'auto'
        }}>
          {plan.newLearning.words.slice(0, 5).map((word) => (
            <div
              key={word.wordId}
              style={{
                padding: '12px',
                backgroundColor: '#F5EFE7',
                borderRadius: '4px',
                display: 'flex',
                justifyContent: 'space-between'
              }}
            >
              <span style={{ fontWeight: '500' }}>{word.word}</span>
              <span style={{ fontSize: '12px', color: '#8c8c8c' }}>
                {word.totalMeanings} 个词义
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ color: '#8c8c8c', textAlign: 'center', padding: '16px' }}>
          {plan.newLearning.available === 0 
            ? '📚 该词书所有单词已学完！' 
            : plan.newLearning.quota <= 0
            ? '⏰ 今日配额已用完，明天继续加油！'
            : '✅ 今日学习已完成'}
        </div>
      )}
    </div>
  );
}
